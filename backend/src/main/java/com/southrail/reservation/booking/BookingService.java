package com.southrail.reservation.booking;

import com.southrail.reservation.booking.dto.BookingDtos;
import com.southrail.reservation.shared.web.error.ApiException;
import com.southrail.reservation.account.User;
import com.southrail.reservation.account.RoleName;
import com.southrail.reservation.account.UserRepository;
import com.southrail.reservation.audit.AuditLogService;
import com.southrail.reservation.booking.inventory.BookingSeat;
import com.southrail.reservation.booking.inventory.SeatAllocationService;
import com.southrail.reservation.notification.email.EmailNotificationService;
import com.southrail.reservation.train.Station;
import com.southrail.reservation.train.StationRepository;
import com.southrail.reservation.train.Train;
import com.southrail.reservation.train.TrainRepository;
import com.southrail.reservation.train.RouteStop;
import com.southrail.reservation.train.RouteStopRepository;

import java.math.BigDecimal;
import java.security.SecureRandom;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.stream.Collectors;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class BookingService {
  private final BookingRepository bookings;
  private final PassengerRepository passengers;
  private final UserRepository users;
  private final TrainRepository trains;
  private final StationRepository stations;
  private final RouteStopRepository routeStops;
  private final SeatAllocationService seatAllocationService;
  private final SecureRandom random = new SecureRandom();
  private final EmailNotificationService accountEmailService;
  private final AuditLogService auditLogService;
  private final FareCalculationService fareCalculationService;
  private static final Logger log = LoggerFactory.getLogger(BookingService.class);
  static final int RAC_LIMIT = 10;
  public BookingService(BookingRepository bookings, PassengerRepository passengers, UserRepository users,
      TrainRepository trains, StationRepository stations, RouteStopRepository routeStops,
      SeatAllocationService seatAllocationService, EmailNotificationService accountEmailService,
      AuditLogService auditLogService) {
    this(bookings, passengers, users, trains, stations, routeStops, seatAllocationService,
        accountEmailService, auditLogService, new FareCalculationService());
  }

  @Autowired
  public BookingService(BookingRepository bookings, PassengerRepository passengers, UserRepository users,
      TrainRepository trains, StationRepository stations, RouteStopRepository routeStops,
      SeatAllocationService seatAllocationService, EmailNotificationService accountEmailService,
      AuditLogService auditLogService, FareCalculationService fareCalculationService) {
    this.bookings = bookings;
    this.passengers = passengers;
    this.users = users;
    this.trains = trains;
    this.stations = stations;
    this.routeStops = routeStops;
    this.seatAllocationService = seatAllocationService;
    this.accountEmailService=accountEmailService;
    this.auditLogService=auditLogService;
    this.fareCalculationService = fareCalculationService;
  }

  @Transactional
  public BookingDtos.BookingResponse create(String email, BookingDtos.BookingRequest request) {
    User user = users.findByEmailIgnoreCase(email).orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "User not found"));
    // Serializes inventory and queue decisions for this train only.
    Train train = trains.findByIdForUpdate(parseTrainId(request.getTrainId())).orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Train not found"));
    Station source = stations.findByCodeIgnoreCase(request.getSourceStationCode()).orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Source station not found"));
    Station destination = stations.findByCodeIgnoreCase(request.getDestinationStationCode()).orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Destination station not found"));
    JourneyStops journeyStops = validateJourney(train, source, destination, request.getJourneyDate(), request.getTravelClass());
    int passengerCount = request.getPassengers().size();
    String travelClass = request.getTravelClass().toUpperCase(Locale.ROOT);

    int availableSeats = seatAllocationService.getAvailableSeatCount(
            train,
            request.getJourneyDate(),
            travelClass);

    BookingStatus bookingStatus;
    Integer queuePosition = null;
    String reservationLabel;
    long racPassengerCount = bookings.countQueuedPassengers(
        train.getId(), request.getJourneyDate(), travelClass, BookingStatus.RAC);
    boolean waitlistExists = bookings.countByTrainIdAndJourneyDateAndTravelClassAndStatus(
        train.getId(), request.getJourneyDate(), travelClass, BookingStatus.WAITLISTED) > 0;

    // Existing queued parties always have priority over a newcomer.
    if (availableSeats >= passengerCount && racPassengerCount == 0 && !waitlistExists) {
      bookingStatus = BookingStatus.CONFIRMED;
      reservationLabel = "CNF";
    } else {
      if (!waitlistExists && racPassengerCount + passengerCount <= RAC_LIMIT) {
        bookingStatus = BookingStatus.RAC;
        queuePosition = bookings.findMaximumQueuePosition(
            train.getId(), request.getJourneyDate(), travelClass, BookingStatus.RAC) + 1;
        reservationLabel = "RAC " + queuePosition;
      } else {
        bookingStatus = BookingStatus.WAITLISTED;
        queuePosition = bookings.findMaximumQueuePosition(
            train.getId(), request.getJourneyDate(), travelClass, BookingStatus.WAITLISTED) + 1;
        reservationLabel = "WL " + queuePosition;
      }
    }

    Booking booking = new Booking();
    booking.setUser(user);
    booking.setTrain(train);
    booking.setSourceStation(source);
    booking.setDestinationStation(destination);
    booking.setJourneyDate(request.getJourneyDate());
    booking.setTravelClass(travelClass);
    booking.setQuota(request.getQuota());
    booking.setPnr(generatePnr());
    booking.setStatus(bookingStatus);
    booking.setQueuePosition(queuePosition);
    booking.setReservationLabel(reservationLabel);
    booking.setTotalFare(calculateFare(request, journeyStops).total());
    bookings.save(booking);

    List<Passenger> savedPassengers = request.getPassengers().stream().map(item -> {
      Passenger passenger = new Passenger();
      passenger.setBooking(booking);
      passenger.setFullName(item.getFullName());
      passenger.setAge(item.getAge());
      passenger.setGender(item.getGender());
      passenger.setBerthPreference(item.getBerthPreference());
      passenger.setStatus(bookingStatus);
      return passengers.save(passenger);
    }).collect(Collectors.toList());
    List<BookingSeat> allocatedSeats = Collections.emptyList();

    if (bookingStatus == BookingStatus.CONFIRMED) {
      allocatedSeats = seatAllocationService.allocateSeats(
              booking,
              savedPassengers);
    }
    auditLogService.log(
            user.getId(),
            user.getEmail(),
            "BOOKING_CREATED",
            "BOOKING",
            "Ticket booked with status " + booking.getReservationLabel()
                    + " and PNR: " + booking.getPnr()
    );
    try {
      if (bookingStatus == BookingStatus.CONFIRMED) {
        accountEmailService.sendBookingConfirmation(
                booking,
                savedPassengers,
                allocatedSeats);
      }
    } catch (RuntimeException ex) {
      log.warn("booking_confirmation_deferred_failure pnr={} passengerCount={}",
          booking.getPnr(), Integer.valueOf(savedPassengers.size()), ex);
    }
    return new BookingDtos.BookingResponse(booking.getId().toString(), booking.getPnr(), booking.getStatus().name(),
        train.getNumber(), train.getName(),
        source.getCode(), source.getName(),
        destination.getCode(), destination.getName(),
        booking.getJourneyDate(),
        booking.getTravelClass(),
        request.getPassengers().size(),
        booking.getTotalFare(),
        "NOT_COLLECTED",booking.getReservationLabel(),
            booking.getQueuePosition());
  }

  @Transactional(readOnly = true)
  public BookingDtos.BookingReview review(BookingDtos.BookingRequest request) {
    Train train = trains.findById(parseTrainId(request.getTrainId())).orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Train not found"));
    Station source = stations.findByCodeIgnoreCase(request.getSourceStationCode()).orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Source station not found"));
    Station destination = stations.findByCodeIgnoreCase(request.getDestinationStationCode()).orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Destination station not found"));
    JourneyStops journeyStops = validateJourney(train, source, destination, request.getJourneyDate(), request.getTravelClass());

    FareCalculationService.Fare fare = calculateFare(request, journeyStops);
    int availableSeats = seatAllocationService.getAvailableSeatCount(train, request.getJourneyDate(), request.getTravelClass());

    return new BookingDtos.BookingReview(
        fare.baseFare(),
        fare.reservationCharge(),
        fare.convenienceFee(),
        fare.gst(),
        fare.total(),
        availableSeats,
            availableSeats == 0
                    ? "Confirmed seats full. RAC may be available"
                    : availableSeats < request.getPassengers().size()
                      ? "Limited confirmed seats. RAC may be assigned"
                      : availableSeats < 18
                        ? "Limited seats"
                        : "Available",
        Arrays.asList(
            new BookingDtos.FareLine("Base fare", fare.baseFare()),
            new BookingDtos.FareLine("Reservation charge", fare.reservationCharge()),
            new BookingDtos.FareLine("Convenience fee", fare.convenienceFee()),
            new BookingDtos.FareLine("GST", fare.gst())),
        request.getPassengers().stream()
            .map(passenger -> new BookingDtos.BerthSuggestion(passenger.getFullName(), berthSuggestion(passenger.getAge(), passenger.getBerthPreference()),
                passenger.getAge() > 58 ? "Senior passenger comfort" : "Based on selected preference"))
            .collect(Collectors.toList()),
        Arrays.asList("Cancellation before departure is eligible for refund after railway charges",
            "The complete booking may be cancelled before departure",
            "Refund is routed to the original payment method"));
  }

  @Transactional(readOnly = true)
  public BookingDtos.PnrStatus pnr(String email, String pnr) {
    User currentUser = users.findByEmailIgnoreCase(email)
        .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "User not found"));
    Booking booking = bookings.findByPnr(pnr).orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "PNR not found"));
    if (!currentUser.getRoles().contains(RoleName.ROLE_ADMIN)
        && !booking.getUser().getId().equals(currentUser.getId())) {
      throw new ApiException(HttpStatus.FORBIDDEN, "You are not allowed to access this booking");
    }
    return new BookingDtos.PnrStatus(
        booking.getPnr(),
        booking.getTrain().getNumber(),
        booking.getTrain().getName(),
        booking.getSourceStation().getCode(),
        booking.getSourceStation().getName(),
        booking.getDestinationStation().getCode(),
        booking.getDestinationStation().getName(),
        booking.getJourneyDate(),
        booking.getTravelClass(),
        booking.getQuota(),
        booking.getStatus().name(),
        passengers.findByBooking(booking).stream().map(passenger -> passenger.getFullName() + " - " + passenger.getStatus()).collect(Collectors.toList()),
        booking.getStatus() == BookingStatus.CANCELLED && booking.getRefundAmount() != null
            ? booking.getRefundAmount() : BigDecimal.ZERO,
        booking.getTotalFare(),booking.getReservationLabel(),
            booking.getQueuePosition());
  }

  @Transactional(readOnly = true)
  public Page<BookingDtos.BookingHistoryItem> history(String email, Pageable pageable) {
    User user = users.findByEmailIgnoreCase(email).orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "User not found"));
    return bookings.findByUserOrderByCreatedAtDesc(user, pageable)
        .map(booking -> new BookingDtos.BookingHistoryItem(
            booking.getId().toString(),
            booking.getPnr(),
            booking.getTrain().getId().toString(),
            booking.getTrain().getNumber(),
            booking.getTrain().getName(),
            booking.getSourceStation().getCode(),
            booking.getSourceStation().getName(),
            booking.getDestinationStation().getCode(),
            booking.getDestinationStation().getName(),
            booking.getJourneyDate(),
            booking.getStatus().name(),
            booking.getTotalFare(),booking.getReservationLabel(),
                booking.getQueuePosition()));
  }

  private String generatePnr() {
    return String.valueOf(1000000000L + Math.abs(random.nextLong() % 8999999999L));
  }

  private UUID parseTrainId(String trainId) {
    try {
      return UUID.fromString(trainId);
    } catch (IllegalArgumentException ex) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "Train id must be a valid UUID");
    }
  }

  private JourneyStops validateJourney(Train train, Station source, Station destination, LocalDate journeyDate,
      String travelClass) {
    if (!train.isActive()) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "Train is inactive");
    }
    if (source.getId().equals(destination.getId())) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "Source and destination must be different");
    }
    RouteStop sourceStop = routeStops.findFirstByTrainAndStationOrderByStopOrderAsc(train, source)
        .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "Source station is not on the selected train route"));
    RouteStop destinationStop = routeStops.findFirstByTrainAndStationOrderByStopOrderAsc(train, destination)
        .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "Destination station is not on the selected train route"));
    if (sourceStop.getStopOrder() >= destinationStop.getStopOrder()) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "Source must precede destination on the selected train route");
    }
    if (sourceStop.getDepartureTime() != null) {
      LocalDateTime departure = journeyDate.plusDays(sourceStop.getDayOffset())
          .atTime(sourceStop.getDepartureTime());
      if (!departure.isAfter(LocalDateTime.now())) {
        throw new ApiException(HttpStatus.BAD_REQUEST, "Selected journey has already departed");
      }
    }
    if (seatAllocationService.getConfiguredCapacity(train, travelClass) <= 0) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "Travel class is not configured for the selected train");
    }
    return new JourneyStops(sourceStop, destinationStop);
  }

  private FareCalculationService.Fare calculateFare(BookingDtos.BookingRequest request,
      JourneyStops stops) {
    int distance = stops.destination().getDistanceKm() - stops.source().getDistanceKm();
    return fareCalculationService.quote(distance, request.getTravelClass(), request.getPassengers().size());
  }

  private String berthSuggestion(int age, String preference) {
    if (age > 58) {
      return "LOWER";
    }
    return preference == null || preference.trim().isEmpty() ? "NO_PREFERENCE" : preference;
  }

  private record JourneyStops(RouteStop source, RouteStop destination) {}
}
