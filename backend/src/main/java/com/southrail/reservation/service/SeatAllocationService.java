package com.southrail.reservation.service;

import com.southrail.reservation.entity.Booking;
import com.southrail.reservation.entity.BookingSeat;
import com.southrail.reservation.entity.BookingSeatStatus;
import com.southrail.reservation.entity.BookingStatus;
import com.southrail.reservation.entity.Coach;
import com.southrail.reservation.entity.Passenger;
import com.southrail.reservation.entity.Train;
import com.southrail.reservation.exception.ApiException;
import com.southrail.reservation.repository.BookingSeatRepository;
import com.southrail.reservation.repository.CoachRepository;
import com.southrail.reservation.repository.PassengerRepository;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.EnumSet;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SeatAllocationService {
  private static final String NOT_ENOUGH_SEATS_MESSAGE =
      "Not enough seats available for the selected train, date, and class.";
  private static final String CONFLICT_MESSAGE =
      "Selected train/class no longer has enough available seats. Please search again.";
  private static final EnumSet<BookingStatus> ACTIVE_BOOKING_STATUSES = EnumSet.of(
      BookingStatus.CONFIRMED,
      BookingStatus.RAC,
      BookingStatus.WAITLISTED,
      BookingStatus.PARTIALLY_CANCELLED);

  private final CoachRepository coaches;
  private final BookingSeatRepository bookingSeats;
  private final PassengerRepository passengers;

  public SeatAllocationService(CoachRepository coaches, BookingSeatRepository bookingSeats, PassengerRepository passengers) {
    this.coaches = coaches;
    this.bookingSeats = bookingSeats;
    this.passengers = passengers;
  }

  @Transactional(readOnly = true)
  public int getAvailableSeatCount(Train train, LocalDate journeyDate, String travelClass) {
    int capacity = coaches.totalCapacity(train.getId(), travelClass);
    long allocatedSeats = bookingSeats.countActiveBookedSeats(
        train.getId(), journeyDate, travelClass, BookingSeatStatus.BOOKED, ACTIVE_BOOKING_STATUSES);
    long legacyPassengers = countLegacyPassengersWithoutSeat(train.getId(), journeyDate, travelClass);
    long occupiedSeats = allocatedSeats + legacyPassengers;
    return Math.max(0, capacity - Math.toIntExact(Math.min(occupiedSeats, Integer.MAX_VALUE)));
  }

  @Transactional(readOnly = true)
  public List<SeatCandidate> findAvailableSeats(Train train, LocalDate journeyDate, String travelClass) {
    List<SeatCandidate> candidates = buildSeatCandidates(train, travelClass);
    if (candidates.isEmpty()) {
      return candidates;
    }

    Set<String> bookedSeatKeys = bookingSeats.findActiveBookedSeats(
            train.getId(), journeyDate, travelClass, BookingSeatStatus.BOOKED, ACTIVE_BOOKING_STATUSES)
        .stream()
        .map(seat -> seatKey(seat.getCoach().getId(), seat.getSeatNumber()))
        .collect(Collectors.toCollection(HashSet::new));

    List<SeatCandidate> available = candidates.stream()
        .filter(candidate -> !bookedSeatKeys.contains(candidate.key()))
        .collect(Collectors.toCollection(ArrayList::new));

    long legacyPassengers = countLegacyPassengersWithoutSeat(train.getId(), journeyDate, travelClass);
    int anonymousHeldSeats = Math.toIntExact(Math.min(legacyPassengers, available.size()));
    if (anonymousHeldSeats == 0) {
      return available;
    }
    return new ArrayList<>(available.subList(0, available.size() - anonymousHeldSeats));
  }

  @Transactional
  public List<BookingSeat> allocateSeats(Booking booking, List<Passenger> passengerList) {
    if (passengerList.isEmpty()) {
      return List.of();
    }

    List<SeatCandidate> availableSeats = findAvailableSeats(
        booking.getTrain(), booking.getJourneyDate(), booking.getTravelClass());
    if (availableSeats.size() < passengerList.size()) {
      throw new ApiException(HttpStatus.CONFLICT, NOT_ENOUGH_SEATS_MESSAGE);
    }

    List<BookingSeat> allocations = new ArrayList<>();
    for (Passenger passenger : passengerList) {
      SeatCandidate seat = selectSeat(availableSeats, passenger.getBerthPreference());
      BookingSeat allocation = new BookingSeat();
      allocation.setBooking(booking);
      allocation.setPassenger(passenger);
      allocation.setTrain(booking.getTrain());
      allocation.setJourneyDate(booking.getJourneyDate());
      allocation.setTravelClass(booking.getTravelClass());
      allocation.setCoach(seat.coach());
      allocation.setCoachCode(seat.coachCode());
      allocation.setSeatNumber(seat.seatNumber());
      allocation.setBerthType(seat.berthType());
      allocation.setStatus(BookingSeatStatus.BOOKED);
      allocations.add(allocation);
    }

    try {
      List<BookingSeat> savedAllocations = bookingSeats.saveAll(allocations);
      bookingSeats.flush();
      return savedAllocations;
    } catch (DataIntegrityViolationException ex) {
      throw new ApiException(HttpStatus.CONFLICT, CONFLICT_MESSAGE);
    }
  }

  @Transactional
  public void releaseSeatsForBooking(Booking booking) {
    List<BookingSeat> allocations = bookingSeats.findByBooking(booking);
    allocations.stream()
        .filter(allocation -> allocation.getStatus() == BookingSeatStatus.BOOKED)
        .forEach(allocation -> allocation.setStatus(BookingSeatStatus.RELEASED));
    bookingSeats.saveAll(allocations);
  }

  private List<SeatCandidate> buildSeatCandidates(Train train, String travelClass) {
    return coaches.findByTrainAndTravelClassOrderByCoachCode(train, travelClass).stream()
        .flatMap(coach -> java.util.stream.IntStream.rangeClosed(1, coach.getCapacity())
            .mapToObj(seatNumber -> new SeatCandidate(
                coach,
                coach.getId(),
                coach.getCoachCode(),
                seatNumber,
                berthTypeForSeat(travelClass, seatNumber))))
        .collect(Collectors.toCollection(ArrayList::new));
  }

  private SeatCandidate selectSeat(List<SeatCandidate> availableSeats, String berthPreference) {
    String preferredBerthType = preferredBerthType(berthPreference);
    if (preferredBerthType != null) {
      for (int index = 0; index < availableSeats.size(); index++) {
        if (preferredBerthType.equals(availableSeats.get(index).berthType())) {
          return availableSeats.remove(index);
        }
      }
    }
    return availableSeats.remove(0);
  }

  private long countLegacyPassengersWithoutSeat(UUID trainId, LocalDate journeyDate, String travelClass) {
    return passengers.countActivePassengersWithoutBookedSeat(
        trainId, journeyDate, travelClass, ACTIVE_BOOKING_STATUSES, BookingSeatStatus.BOOKED);
  }

  private String berthTypeForSeat(String travelClass, int seatNumber) {
    String normalizedClass = travelClass == null ? "" : travelClass.trim().toUpperCase(Locale.ROOT);
    if ("SL".equals(normalizedClass) || "3A".equals(normalizedClass)) {
      return switch ((seatNumber - 1) % 8) {
        case 0, 3 -> "LB";
        case 1, 4 -> "MB";
        case 2, 5 -> "UB";
        case 6 -> "SL";
        default -> "SU";
      };
    }
    if ("2A".equals(normalizedClass)) {
      return switch ((seatNumber - 1) % 6) {
        case 0, 2 -> "LB";
        case 1, 3 -> "UB";
        case 4 -> "SL";
        default -> "SU";
      };
    }
    if ("1A".equals(normalizedClass)) {
      return seatNumber % 2 == 0 ? "COUPE" : "CABIN";
    }
    return "GENERAL";
  }

  private String preferredBerthType(String berthPreference) {
    if (berthPreference == null || berthPreference.trim().isEmpty()) {
      return null;
    }
    return switch (berthPreference.trim().toUpperCase(Locale.ROOT).replace(' ', '_')) {
      case "LOWER", "LOWER_BERTH", "LB" -> "LB";
      case "MIDDLE", "MIDDLE_BERTH", "MB" -> "MB";
      case "UPPER", "UPPER_BERTH", "UB" -> "UB";
      case "SIDE_LOWER", "SIDE_LOWER_BERTH", "SL" -> "SL";
      case "SIDE_UPPER", "SIDE_UPPER_BERTH", "SU" -> "SU";
      default -> null;
    };
  }

  private String seatKey(UUID coachId, int seatNumber) {
    return coachId + ":" + seatNumber;
  }

  public record SeatCandidate(Coach coach, UUID coachId, String coachCode, int seatNumber, String berthType) {
    String key() {
      return coachId + ":" + seatNumber;
    }
  }
}
