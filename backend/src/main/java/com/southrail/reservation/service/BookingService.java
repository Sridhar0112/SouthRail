package com.southrail.reservation.service;

import com.southrail.reservation.dto.BookingDtos;
import com.southrail.reservation.entity.*;
import com.southrail.reservation.exception.ApiException;
import com.southrail.reservation.repository.*;

import java.math.BigDecimal;
import java.security.SecureRandom;
import java.time.LocalDate;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class BookingService {
  private final BookingRepository bookings;
  private final PassengerRepository passengers;
  private final UserRepository users;
  private final TrainRepository trains;
  private final StationRepository stations;
  private final SeatAllocationService seatAllocationService;
  private final SecureRandom random = new SecureRandom();
  private AccountEmailService accountEmailService;
  private final AuditLogService auditLogService;
  private static final Logger log = LoggerFactory.getLogger(BookingService.class);
  private static final int RAC_LIMIT = 10;
  public BookingService(BookingRepository bookings, PassengerRepository passengers, UserRepository users,
      TrainRepository trains, StationRepository stations, SeatAllocationService seatAllocationService,AccountEmailService accountEmailService,AuditLogService auditLogService) {
    this.bookings = bookings;
    this.passengers = passengers;
    this.users = users;
    this.trains = trains;
    this.stations = stations;
    this.seatAllocationService = seatAllocationService;
    this.accountEmailService=accountEmailService;
    this.auditLogService=auditLogService;
  }

  @Transactional
  public BookingDtos.BookingResponse create(String email, BookingDtos.BookingRequest request) {
    User user = users.findByEmailIgnoreCase(email).orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "User not found"));
    Train train = trains.findById(parseTrainId(request.getTrainId())).orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Train not found"));
    Station source = stations.findByCodeIgnoreCase(request.getSourceStationCode()).orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Source station not found"));
    Station destination = stations.findByCodeIgnoreCase(request.getDestinationStationCode()).orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Destination station not found"));
    int passengerCount = request.getPassengers().size();

    int availableSeats = seatAllocationService.getAvailableSeatCount(
            train,
            request.getJourneyDate(),
            request.getTravelClass());

    BookingStatus bookingStatus;
    Integer queuePosition = null;
    String reservationLabel;

    if (availableSeats >= passengerCount) {
      bookingStatus = BookingStatus.CONFIRMED;
      reservationLabel = "CNF";
    } else {
      long racCount = bookings.countByTrainIdAndJourneyDateAndTravelClassAndStatus(
              train.getId(),
              request.getJourneyDate(),
              request.getTravelClass(),
              BookingStatus.RAC);

      if (racCount < RAC_LIMIT) {
        bookingStatus = BookingStatus.RAC;
        queuePosition = Math.toIntExact(racCount + 1);
        reservationLabel = "RAC " + queuePosition;
      } else {
        long waitlistCount = bookings.countByTrainIdAndJourneyDateAndTravelClassAndStatus(
                train.getId(),
                request.getJourneyDate(),
                request.getTravelClass(),
                BookingStatus.WAITLISTED);

        bookingStatus = BookingStatus.WAITLISTED;
        queuePosition = Math.toIntExact(waitlistCount + 1);
        reservationLabel = "WL " + queuePosition;
      }
    }

    Booking booking = new Booking();
    booking.setUser(user);
    booking.setTrain(train);
    booking.setSourceStation(source);
    booking.setDestinationStation(destination);
    booking.setJourneyDate(request.getJourneyDate());
    booking.setTravelClass(request.getTravelClass());
    booking.setQuota(request.getQuota());
    booking.setPnr(generatePnr());
    booking.setStatus(bookingStatus);
    booking.setQueuePosition(queuePosition);
    booking.setReservationLabel(reservationLabel);
    booking.setTotalFare(calculateFare(request).getTotal());
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
    List<BookingSeat> allocatedSeats = List.of();

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
    } catch (Exception ignored) {
      log.error("Unable to send mail for " + allocatedSeats + " " + ignored.getMessage());
    }
    return new BookingDtos.BookingResponse(booking.getId().toString(), booking.getPnr(), booking.getStatus().name(),
        train.getNumber(), train.getName(),
        source.getCode(), source.getName(),
        destination.getCode(), destination.getName(),
        booking.getJourneyDate(),
        booking.getTravelClass(),
        request.getPassengers().size(),
        booking.getTotalFare(),
        "NOT_COLLECTED");
  }

  @Transactional(readOnly = true)
  public BookingDtos.BookingReview review(BookingDtos.BookingRequest request) {
    Train train = trains.findById(parseTrainId(request.getTrainId())).orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Train not found"));
    stations.findByCodeIgnoreCase(request.getSourceStationCode()).orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Source station not found"));
    stations.findByCodeIgnoreCase(request.getDestinationStationCode()).orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Destination station not found"));

    FareParts fare = calculateFare(request);
    int availableSeats = seatAllocationService.getAvailableSeatCount(train, request.getJourneyDate(), request.getTravelClass());

    return new BookingDtos.BookingReview(
        fare.getBaseFare(),
        fare.getReservationCharge(),
        fare.getConvenienceFee(),
        fare.getGst(),
        fare.getTotal(),
        availableSeats,
            availableSeats == 0
                    ? "Confirmed seats full. RAC may be available"
                    : availableSeats < request.getPassengers().size()
                      ? "Limited confirmed seats. RAC may be assigned"
                      : availableSeats < 18
                        ? "Limited seats"
                        : "Available",
        Arrays.asList(
            new BookingDtos.FareLine("Base fare", fare.getBaseFare()),
            new BookingDtos.FareLine("Reservation charge", fare.getReservationCharge()),
            new BookingDtos.FareLine("Convenience fee", fare.getConvenienceFee()),
            new BookingDtos.FareLine("GST", fare.getGst())),
        request.getPassengers().stream()
            .map(passenger -> new BookingDtos.BerthSuggestion(passenger.getFullName(), berthSuggestion(passenger.getAge(), passenger.getBerthPreference()),
                passenger.getAge() > 58 ? "Senior passenger comfort" : "Based on selected preference"))
            .collect(Collectors.toList()),
        Arrays.asList("Cancellation before charting is eligible for refund after railway charges",
            "Partial cancellation is allowed until chart preparation",
            "Refund is routed to the original payment method"));
  }

  @Transactional(readOnly = true)
  public BookingDtos.PnrStatus pnr(String pnr) {
    Booking booking = bookings.findByPnr(pnr).orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "PNR not found"));
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
        booking.getStatus() == BookingStatus.CANCELLED ? booking.getTotalFare().multiply(BigDecimal.valueOf(0.82)) : BigDecimal.ZERO,
        booking.getTotalFare());
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
            booking.getTotalFare()));
  }

  @Transactional
  public BookingDtos.PnrStatus cancel(String pnr) {
    Booking booking = bookings.findByPnr(pnr).orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "PNR not found"));
    booking.setStatus(BookingStatus.CANCELLED);
    seatAllocationService.releaseSeatsForBooking(booking);
    return pnr(pnr);
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

  private BigDecimal classBaseFare(String travelClass) {
    switch (travelClass.toUpperCase()) {
      case "1A":
        return BigDecimal.valueOf(2850);
      case "2A":
        return BigDecimal.valueOf(1950);
      case "3A":
        return BigDecimal.valueOf(1260);
      case "CC":
        return BigDecimal.valueOf(880);
      case "SL":
        return BigDecimal.valueOf(420);
      default:
        return BigDecimal.valueOf(260);
    }
  }

  private FareParts calculateFare(BookingDtos.BookingRequest request) {
    BigDecimal passengerCount = BigDecimal.valueOf(request.getPassengers().size());
    BigDecimal baseFare = classBaseFare(request.getTravelClass()).multiply(passengerCount);
    BigDecimal reservationCharge = BigDecimal.valueOf(40).multiply(passengerCount);
    BigDecimal convenienceFee = BigDecimal.valueOf(24);
    BigDecimal gst = baseFare.multiply(BigDecimal.valueOf(0.05));
    return new FareParts(baseFare, reservationCharge, convenienceFee, gst,
        baseFare.add(reservationCharge).add(convenienceFee).add(gst));
  }

  private String berthSuggestion(int age, String preference) {
    if (age > 58) {
      return "LOWER";
    }
    return preference == null || preference.trim().isEmpty() ? "NO_PREFERENCE" : preference;
  }

  private static class FareParts {
    private final BigDecimal baseFare;
    private final BigDecimal reservationCharge;
    private final BigDecimal convenienceFee;
    private final BigDecimal gst;
    private final BigDecimal total;

    FareParts(BigDecimal baseFare, BigDecimal reservationCharge, BigDecimal convenienceFee, BigDecimal gst, BigDecimal total) {
      this.baseFare = baseFare;
      this.reservationCharge = reservationCharge;
      this.convenienceFee = convenienceFee;
      this.gst = gst;
      this.total = total;
    }

    BigDecimal getBaseFare() {
      return baseFare;
    }

    BigDecimal getReservationCharge() {
      return reservationCharge;
    }

    BigDecimal getConvenienceFee() {
      return convenienceFee;
    }

    BigDecimal getGst() {
      return gst;
    }

    BigDecimal getTotal() {
      return total;
    }
  }
}
