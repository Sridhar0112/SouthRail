package com.southrail.reservation.service.booking;

import com.southrail.reservation.config.properties.ReservationHoldProperties;
import com.southrail.reservation.dto.booking.BookingDtos;
import com.southrail.reservation.dto.booking.ReservationHoldDtos;
import com.southrail.reservation.entity.account.User;
import com.southrail.reservation.entity.booking.*;
import com.southrail.reservation.exception.ApiException;
import com.southrail.reservation.repository.account.UserRepository;
import com.southrail.reservation.repository.booking.BookingRepository;
import com.southrail.reservation.repository.booking.ReservationHoldRepository;
import com.southrail.reservation.repository.train.StationRepository;
import com.southrail.reservation.repository.train.TrainRepository;
import com.southrail.reservation.service.audit.AuditLogService;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.HexFormat;
import java.util.Locale;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ReservationHoldService {
  private final ReservationHoldRepository holds;
  private final BookingRepository bookings;
  private final UserRepository users;
  private final TrainRepository trains;
  private final StationRepository stations;
  private final BookingService bookingService;
  private final ReservationHoldProperties config;
  private final AuditLogService audit;

  public ReservationHoldService(ReservationHoldRepository holds, BookingRepository bookings,
      UserRepository users, TrainRepository trains, StationRepository stations,
      BookingService bookingService, ReservationHoldProperties config, AuditLogService audit) {
    this.holds = holds; this.bookings = bookings; this.users = users; this.trains = trains;
    this.stations = stations; this.bookingService = bookingService; this.config = config; this.audit = audit;
  }

  @Transactional
  public ReservationHoldDtos.HoldResponse create(String email, String key, BookingDtos.BookingRequest request) {
    User user = user(email);
    String normalizedKey = normalizeKey(key);
    String fingerprint = fingerprint(request);
    bookings.acquireScopedLock("hold-request:" + user.getId() + ":" + normalizedKey);
    ReservationHold existing = holds.findByUserAndIdempotencyKey(user, normalizedKey).orElse(null);
    if (existing != null) {
      if (!existing.getRequestFingerprint().equals(fingerprint)) {
        throw new ApiException(HttpStatus.CONFLICT, "IDEMPOTENCY_CONFLICT",
            "Idempotency-Key has already been used for a different reservation");
      }
      expireIfNecessary(existing);
      return response(existing);
    }
    UUID trainId = parseId(request.getTrainId());
    String travelClass = request.getTravelClass().toUpperCase(Locale.ROOT);
    bookings.acquireScopedLock("inventory:" + trainId + ":" + request.getJourneyDate() + ":" + travelClass);
    BookingDtos.BookingReview review = bookingService.review(request);
    ReservationHold hold = new ReservationHold();
    hold.setUser(user);
    hold.setTrain(trains.findById(trainId).orElseThrow(() -> notFound("Train")));
    hold.setSourceStation(stations.findByCodeIgnoreCase(request.getSourceStationCode()).orElseThrow(() -> notFound("Source station")));
    hold.setDestinationStation(stations.findByCodeIgnoreCase(request.getDestinationStationCode()).orElseThrow(() -> notFound("Destination station")));
    hold.setJourneyDate(request.getJourneyDate()); hold.setTravelClass(travelClass);
    hold.setQuota(request.getQuota().toUpperCase(Locale.ROOT)); hold.setTotalFare(review.getTotalFare());
    hold.setStatus(ReservationHoldStatus.ACTIVE); hold.setExpiresAt(Instant.now().plus(config.duration()));
    hold.setIdempotencyKey(normalizedKey); hold.setRequestFingerprint(fingerprint);
    String availability = review.getAvailabilityStatus().toUpperCase(Locale.ROOT);
    BookingStatus provisional = availability.contains("RAC") ? BookingStatus.RAC
        : availability.contains("WAIT") ? BookingStatus.WAITLISTED : BookingStatus.CONFIRMED;
    hold.setProvisionalStatus(provisional);
    hold.setReservationLabel(provisional == BookingStatus.CONFIRMED ? "CNF" : provisional.name());
    for (int index = 0; index < request.getPassengers().size(); index++) {
      BookingDtos.PassengerRequest item = request.getPassengers().get(index);
      ReservationHoldPassenger passenger = new ReservationHoldPassenger();
      passenger.setHold(hold); passenger.setPassengerOrder(index); passenger.setFullName(item.getFullName().trim());
      passenger.setAge(item.getAge()); passenger.setGender(item.getGender().toUpperCase(Locale.ROOT));
      passenger.setBerthPreference(item.getBerthPreference() == null ? null : item.getBerthPreference().toUpperCase(Locale.ROOT));
      hold.getPassengers().add(passenger);
    }
    holds.saveAndFlush(hold);
    audit.log(user.getId(), user.getEmail(), "RESERVATION_HOLD_CREATED", "BOOKING", "Reservation hold " + hold.getId() + " created");
    return response(hold);
  }

  @Transactional
  public ReservationHoldDtos.HoldResponse get(String email, UUID id) {
    ReservationHold hold = holds.findByIdForUpdate(id).orElseThrow(() -> notFound("Reservation hold"));
    requireOwner(user(email), hold); expireIfNecessary(hold); return response(hold);
  }

  void expireIfNecessary(ReservationHold hold) {
    if (hold.getStatus() == ReservationHoldStatus.ACTIVE && !Instant.now().isBefore(hold.getExpiresAt())) {
      hold.setStatus(ReservationHoldStatus.EXPIRED);
      audit.log(hold.getUser().getId(), hold.getUser().getEmail(), "RESERVATION_HOLD_EXPIRED", "BOOKING", "Reservation hold " + hold.getId() + " expired");
    }
  }

  BookingDtos.BookingRequest bookingRequest(ReservationHold h) {
    return new BookingDtos.BookingRequest(h.getTrain().getId().toString(), h.getSourceStation().getCode(),
        h.getDestinationStation().getCode(), h.getJourneyDate(), h.getTravelClass(), h.getQuota(),
        h.getPassengers().stream().map(p -> new BookingDtos.PassengerRequest(
            p.getFullName(), p.getAge(), p.getGender(), p.getBerthPreference())).toList());
  }

  ReservationHoldDtos.HoldResponse response(ReservationHold h) {
    Booking b = h.getBooking();
    return new ReservationHoldDtos.HoldResponse(h.getId(), h.getStatus().name(), h.getExpiresAt(),
        h.getProvisionalStatus().name(), h.getReservationLabel(), h.getTotalFare(), h.getTrain().getNumber(),
        h.getTrain().getName(), h.getSourceStation().getCode(), h.getDestinationStation().getCode(),
        h.getJourneyDate(), h.getTravelClass(), h.getQuota(), h.getPassengers().stream().map(p ->
          new ReservationHoldDtos.HoldPassenger(p.getFullName(), p.getAge(), p.getGender(), p.getBerthPreference())).toList(),
        b == null ? null : b.getId(), b == null ? null : b.getPnr(), b == null ? null : b.getStatus().name());
  }

  private User user(String email) { return users.findByEmailIgnoreCase(email).orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "User not found")); }
  void requireOwner(User user, ReservationHold hold) { if (!hold.getUser().getId().equals(user.getId())) throw new ApiException(HttpStatus.FORBIDDEN, "HOLD_ACCESS_DENIED", "Reservation hold does not belong to this user"); }
  private String normalizeKey(String key) { if (key == null || key.isBlank() || key.trim().length() > 128) throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_IDEMPOTENCY_KEY", "A valid Idempotency-Key is required"); return key.trim(); }
  private UUID parseId(String value) { try { return UUID.fromString(value); } catch (IllegalArgumentException ex) { throw new ApiException(HttpStatus.BAD_REQUEST, "Train id must be a valid UUID"); } }
  private ApiException notFound(String thing) { return new ApiException(HttpStatus.NOT_FOUND, "HOLD_NOT_FOUND", thing + " not found"); }
  private String fingerprint(BookingDtos.BookingRequest r) { try { return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest((r.getTrainId()+"|"+r.getSourceStationCode().toUpperCase(Locale.ROOT)+"|"+r.getDestinationStationCode().toUpperCase(Locale.ROOT)+"|"+r.getJourneyDate()+"|"+r.getTravelClass().toUpperCase(Locale.ROOT)+"|"+r.getQuota().toUpperCase(Locale.ROOT)+"|"+r.getPassengers().stream().map(p -> p.getFullName().trim()+":"+p.getAge()+":"+p.getGender().toUpperCase(Locale.ROOT)+":"+p.getBerthPreference()).toList()).getBytes(StandardCharsets.UTF_8))); } catch (Exception ex) { throw new IllegalStateException(ex); } }
}
