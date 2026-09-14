package com.southrail.reservation.service.booking;

import com.southrail.reservation.dto.booking.CancellationResponse;
import com.southrail.reservation.dto.booking.CancellationReviewResponse;
import com.southrail.reservation.dto.booking.RefundQuoteDto;
import com.southrail.reservation.entity.account.RoleName;
import com.southrail.reservation.entity.account.User;
import com.southrail.reservation.entity.booking.Booking;
import com.southrail.reservation.entity.booking.BookingStatus;
import com.southrail.reservation.entity.booking.Passenger;
import com.southrail.reservation.entity.train.Train;
import com.southrail.reservation.exception.ApiException;
import com.southrail.reservation.repository.account.UserRepository;
import com.southrail.reservation.repository.booking.BookingRepository;
import com.southrail.reservation.repository.booking.PassengerRepository;
import com.southrail.reservation.repository.train.TrainRepository;
import com.southrail.reservation.service.audit.AuditLogService;
import com.southrail.reservation.service.notification.NotificationService;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.context.ApplicationEventPublisher;

@Service
public class BookingCancellationService {
  private static final Logger log = LoggerFactory.getLogger(BookingCancellationService.class);
  private final BookingRepository bookings;
  private final UserRepository users;
  private final RefundCalculationService refundCalculationService;
  private final NotificationService notificationService;
  private final SeatAllocationService seatAllocationService;
  private final AuditLogService auditLogService;
  private final TrainRepository trains;
  private final PassengerRepository passengers;
  private final ApplicationEventPublisher events;
  public BookingCancellationService(BookingRepository bookings, UserRepository users,
      RefundCalculationService refundCalculationService, NotificationService notificationService,
      SeatAllocationService seatAllocationService, AuditLogService auditLogService,
      TrainRepository trains, PassengerRepository passengers) {
    this(bookings, users, refundCalculationService, notificationService, seatAllocationService,
        auditLogService, trains, passengers, event -> { });
  }

  @org.springframework.beans.factory.annotation.Autowired
  public BookingCancellationService(BookingRepository bookings, UserRepository users,
      RefundCalculationService refundCalculationService, NotificationService notificationService,
      SeatAllocationService seatAllocationService, AuditLogService auditLogService,
      TrainRepository trains, PassengerRepository passengers, ApplicationEventPublisher events) {
    this.bookings = bookings;
    this.users = users;
    this.refundCalculationService = refundCalculationService;
    this.notificationService = notificationService;
    this.seatAllocationService = seatAllocationService;
    this.auditLogService=auditLogService;
    this.trains = trains;
    this.passengers = passengers;
    this.events = events;
  }

  @Transactional(readOnly = true)
  public CancellationReviewResponse review(String email, String pnr) {
    User currentUser = findCurrentUser(email);
    Booking booking = findBooking(pnr);
    validateBookingOwnership(currentUser, booking);

    if (booking.getStatus() == BookingStatus.CANCELLED) {
      return cancellationReview(booking, zeroRefund(booking), false, "Booking is already cancelled.");
    }

    validateBookingCanBeCancelled(booking);
    RefundQuoteDto quote = refundCalculationService.calculate(booking);
    return cancellationReview(booking, quote, true, quote.getPolicyMessage());
  }

  @Transactional
  public CancellationResponse cancel(String email, String pnr) {
    User currentUser = findCurrentUser(email);
    Booking observedBooking = findBooking(pnr);
    java.util.UUID trainId = observedBooking.getTrain().getId();
    bookings.acquireScopedLock("inventory:" + trainId + ":" + observedBooking.getJourneyDate()
        + ":" + observedBooking.getTravelClass().toUpperCase(java.util.Locale.ROOT));
    Train train = trains.findById(trainId)
        .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Train not found"));
    Booking booking = findBookingForUpdate(pnr);
    validateBookingOwnership(currentUser, booking);
    validateBookingCanBeCancelled(booking);
    // Admin ownership validation returns without touching the lazy owner. Capture
    // every value needed after native queue compaction clears the persistence
    // context, while the booking is still managed.
    User bookingOwner = booking.getUser();
    java.util.UUID bookingOwnerId = bookingOwner.getId();
    String bookingOwnerEmail = bookingOwner.getEmail();
    String cancelledPnr = booking.getPnr();
    BookingStatus previousBookingStatus = booking.getStatus();
    String previousReservationLabel = booking.getReservationLabel();

    RefundQuoteDto quote = refundCalculationService.calculate(booking);
    booking.setStatus(BookingStatus.CANCELLED);
    booking.setRefundAmount(quote.getRefundAmount());
    booking.setCancellationCharge(quote.getCancellationCharge());
    seatAllocationService.releaseSeatsForBooking(booking);
    passengers.findByBooking(booking).forEach(passenger -> passenger.setStatus(BookingStatus.CANCELLED));
    booking.setQueuePosition(null);
    booking.setReservationLabel("CANCELLED");
    bookings.flush();
    rebalanceQueues(train, booking);
    auditLogService.log(
            bookingOwnerId,
            bookingOwnerEmail,
            "BOOKING_CANCELLED",
            "BOOKING",
            "Ticket cancelled successfully with PNR: " + cancelledPnr
    );
    if (previousBookingStatus == BookingStatus.WAITLISTED) {
      auditLogService.log(bookingOwnerId, bookingOwnerEmail, "WAITLIST_CANCELLED", "BOOKING",
          "Waitlist booking cancelled; PNR: " + cancelledPnr
              + "; previous status: " + previousReservationLabel);
    }
    try {
      notificationService.notifyBookingCancelled(
          bookingOwnerId, cancelledPnr, quote.getRefundAmount());
    } catch (RuntimeException ex) {
      log.warn("cancellation_notification_failed pnr={}", cancelledPnr, ex);
    }

    return new CancellationResponse(
        cancelledPnr,
        booking.getStatus().name(),
        quote.getRefundAmount(),
        quote.getCancellationCharge(),
        quote.getRefundPercentage(),
        quote.getTotalFare(),
        cancellationMessage(quote),
        Instant.now());
  }

  private void rebalanceQueues(Train train, Booking cancelledBooking) {
    java.util.UUID trainId = train.getId();
    java.time.LocalDate journeyDate = cancelledBooking.getJourneyDate();
    String travelClass = cancelledBooking.getTravelClass();
    log.info("waitlist_promotion_started train={} journey_date={} class={}",
        trainId, journeyDate, travelClass);
    java.util.Map<java.util.UUID, String> previousQueueLabels = new java.util.HashMap<>();
    boolean changed;
    do {
      changed = false;
      int availableSeats = seatAllocationService.getAvailableSeatCount(
          train, journeyDate, travelClass);
      List<Booking> racQueue = bookings.findQueueForUpdate(
          trainId, journeyDate, travelClass, BookingStatus.RAC);
      for (Booking next : racQueue) {
        List<Passenger> queuedPassengers = passengers.findByBooking(next);
        if (queuedPassengers.size() > availableSeats) {
          break; // Preserve FIFO ordering; do not let a smaller party jump the queue.
        }
        // Allocate while this party is still RAC. Marking it confirmed first makes
        // the legacy-inventory fallback count its passengers as already occupying
        // anonymous seats, so findAvailableSeats can reject otherwise free capacity.
        String previousStatus = previousQueueLabels.getOrDefault(next.getId(), next.getReservationLabel());
        List<com.southrail.reservation.entity.booking.BookingSeat> assigned =
            seatAllocationService.allocateSeats(next, queuedPassengers);
        next.setStatus(BookingStatus.CONFIRMED);
        next.setQueuePosition(null);
        next.setReservationLabel("CNF");
        queuedPassengers.forEach(passenger -> passenger.setStatus(BookingStatus.CONFIRMED));
        String seatSummary = assigned.stream()
            .map(seat -> seat.getCoachCode() + "/" + seat.getSeatNumber())
            .collect(java.util.stream.Collectors.joining(", "));
        events.publishEvent(new WaitlistPromotionEvent(
            next.getUser().getId(), next.getPnr(), previousStatus, seatSummary));
        auditLogService.log(next.getUser().getId(), next.getUser().getEmail(),
            "WAITLIST_PROMOTED", "BOOKING",
            "Queue booking promoted to CONFIRMED; PNR: " + next.getPnr()
                + "; previous status: " + previousStatus + "; seat: " + seatSummary);
        log.info("waitlist_promotion_completed pnr={} previous_status={} seats={}",
            next.getPnr(), previousStatus, seatSummary);
        availableSeats -= queuedPassengers.size();
        changed = true;
      }
      bookings.flush();
      resequence(trainId, journeyDate, travelClass, BookingStatus.RAC);

      long racPassengers = bookings.countQueuedPassengers(
          trainId, journeyDate, travelClass, BookingStatus.RAC);
      int racVacancies = Math.max(0, BookingService.RAC_LIMIT - Math.toIntExact(racPassengers));
      int nextRacPosition = bookings.findMaximumQueuePosition(
          trainId, journeyDate, travelClass, BookingStatus.RAC) + 1;
      List<Booking> waitlist = bookings.findQueueForUpdate(
          trainId, journeyDate, travelClass, BookingStatus.WAITLISTED);
      for (Booking waiting : waitlist) {
        int partySize = Math.toIntExact(passengers.countByBooking(waiting));
        if (partySize > racVacancies) {
          break; // FIFO, and bookings are the indivisible queue unit in the current model.
        }
        previousQueueLabels.put(waiting.getId(), waiting.getReservationLabel());
        waiting.setQueuePosition(nextRacPosition++);
        waiting.setReservationLabel("RAC " + waiting.getQueuePosition());
        waiting.setStatus(BookingStatus.RAC);
        passengers.findByBooking(waiting).forEach(passenger -> passenger.setStatus(BookingStatus.RAC));
        racVacancies -= partySize;
        auditLogService.log(waiting.getUser().getId(), waiting.getUser().getEmail(),
            "WAITLIST_PROMOTED", "BOOKING",
            "Waitlist booking promoted to " + waiting.getReservationLabel()
                + "; PNR: " + waiting.getPnr());
        changed = true;
      }
      bookings.flush();
      resequence(trainId, journeyDate, travelClass, BookingStatus.RAC);
      resequence(trainId, journeyDate, travelClass, BookingStatus.WAITLISTED);
    } while (changed);
  }

  private void resequence(java.util.UUID trainId, java.time.LocalDate journeyDate,
      String travelClass, BookingStatus status) {
    // Move rows out of the target range first so immediate partial-unique-index
    // checks cannot collide while positions are compacted.
    bookings.moveQueueToTemporaryRange(
        trainId, journeyDate, travelClass, status.name());
    List<Booking> queue = bookings.findQueueForUpdate(
        trainId, journeyDate, travelClass, status);
    int position = 1;
    for (Booking queued : queue) {
      queued.setQueuePosition(position);
      queued.setReservationLabel(status == BookingStatus.RAC ? "RAC " + position : "WL " + position);
      position++;
    }
    bookings.flush();
  }

  private User findCurrentUser(String email) {
    return users.findByEmailIgnoreCase(email)
        .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "User not found"));
  }

  private Booking findBooking(String pnr) {
    return bookings.findByPnr(pnr)
        .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "PNR not found"));
  }

  private Booking findBookingForUpdate(String pnr) {
    return bookings.findByPnrForUpdate(pnr)
        .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "PNR not found"));
  }

  private void validateBookingOwnership(User currentUser, Booking booking) {
    if (currentUser.getRoles().contains(RoleName.ROLE_ADMIN)) {
      return;
    }
    if (!booking.getUser().getId().equals(currentUser.getId())) {
      throw new ApiException(HttpStatus.FORBIDDEN, "You are not allowed to access this booking");
    }
  }

  private void validateBookingCanBeCancelled(Booking booking) {
    if (booking.getStatus() == BookingStatus.CANCELLED) {
      throw new ApiException(HttpStatus.CONFLICT, "Booking is already cancelled");
    }
    if (booking.getStatus() != BookingStatus.CONFIRMED
        && booking.getStatus() != BookingStatus.RAC
        && booking.getStatus() != BookingStatus.WAITLISTED) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "Booking status is not eligible for cancellation");
    }
    if (refundCalculationService.hasDeparted(booking)) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "A journey that has already departed cannot be cancelled");
    }
  }

  private CancellationReviewResponse cancellationReview(Booking booking, RefundQuoteDto quote, boolean cancellable, String message) {
    return new CancellationReviewResponse(
        booking.getPnr(),
        booking.getTrain().getNumber(),
        booking.getTrain().getName(),
        booking.getSourceStation().getCode(),
        booking.getDestinationStation().getCode(),
        booking.getJourneyDate(),
        booking.getTravelClass(),
        booking.getStatus().name(),
        quote.getTotalFare(),
        quote.getCancellationCharge(),
        quote.getRefundAmount(),
        quote.getRefundPercentage(),
        cancellable,
        message);
  }

  private RefundQuoteDto zeroRefund(Booking booking) {
    BigDecimal totalFare = booking.getTotalFare().setScale(2, RoundingMode.HALF_UP);
    BigDecimal refundAmount = booking.getRefundAmount() == null
        ? BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP)
        : booking.getRefundAmount().setScale(2, RoundingMode.HALF_UP);
    BigDecimal cancellationCharge = booking.getCancellationCharge() == null
        ? totalFare.subtract(refundAmount).setScale(2, RoundingMode.HALF_UP)
        : booking.getCancellationCharge().setScale(2, RoundingMode.HALF_UP);
    return new RefundQuoteDto(
        totalFare,
        refundAmount,
        cancellationCharge,
        totalFare.signum() == 0 ? BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP)
            : refundAmount.multiply(BigDecimal.valueOf(100)).divide(totalFare, 2, RoundingMode.HALF_UP),
        "Booking is already cancelled.");
  }

  private String cancellationMessage(RefundQuoteDto quote) {
    if (quote.getRefundAmount().compareTo(BigDecimal.valueOf(0)) > 0) {
      return "Booking cancelled successfully. Refund amount Rs "
          + quote.getRefundAmount()
          + " will be processed as per policy.";
    }
    return "Booking cancelled successfully. No refund is applicable as per cancellation policy.";
  }
}
