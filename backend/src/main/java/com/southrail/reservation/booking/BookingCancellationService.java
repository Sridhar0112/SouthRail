package com.southrail.reservation.booking;

import com.southrail.reservation.notification.NotificationService;
import com.southrail.reservation.booking.inventory.SeatAllocationService;
import com.southrail.reservation.audit.AuditLogService;

import com.southrail.reservation.booking.dto.CancellationResponse;
import com.southrail.reservation.booking.dto.CancellationReviewResponse;
import com.southrail.reservation.booking.dto.RefundQuoteDto;
import com.southrail.reservation.booking.Booking;
import com.southrail.reservation.booking.BookingStatus;
import com.southrail.reservation.account.RoleName;
import com.southrail.reservation.account.User;
import com.southrail.reservation.shared.web.error.ApiException;
import com.southrail.reservation.booking.BookingRepository;
import com.southrail.reservation.account.UserRepository;
import com.southrail.reservation.train.Train;
import com.southrail.reservation.train.TrainRepository;
import java.util.List;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

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
  public BookingCancellationService(BookingRepository bookings, UserRepository users,
      RefundCalculationService refundCalculationService, NotificationService notificationService,
      SeatAllocationService seatAllocationService, AuditLogService auditLogService,
      TrainRepository trains, PassengerRepository passengers) {
    this.bookings = bookings;
    this.users = users;
    this.refundCalculationService = refundCalculationService;
    this.notificationService = notificationService;
    this.seatAllocationService = seatAllocationService;
    this.auditLogService=auditLogService;
    this.trains = trains;
    this.passengers = passengers;
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
    // Booking creation serializes on the train first. Cancellation uses the same
    // lock order before locking the booking, preventing lock-order deadlocks.
    Train train = trains.findByIdForUpdate(observedBooking.getTrain().getId())
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

    RefundQuoteDto quote = refundCalculationService.calculate(booking);
    booking.setStatus(BookingStatus.CANCELLED);
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
            "Ticket cancelled successfully with PNR: " + booking.getPnr()
    );
    try {
      notificationService.notifyBookingCancelled(bookingOwner, booking, quote);
    } catch (RuntimeException ex) {
      log.warn("cancellation_notification_failed pnr={}", booking.getPnr(), ex);
    }

    return new CancellationResponse(
        booking.getPnr(),
        booking.getStatus().name(),
        quote.getRefundAmount(),
        quote.getCancellationCharge(),
        quote.getRefundPercentage(),
        quote.getTotalFare(),
        cancellationMessage(quote),
        Instant.now());
  }

  private void rebalanceQueues(Train train, Booking cancelledBooking) {
    while (true) {
      int availableSeats = seatAllocationService.getAvailableSeatCount(
          train, cancelledBooking.getJourneyDate(), cancelledBooking.getTravelClass());
      if (availableSeats == 0) {
        break;
      }
      List<Booking> racQueue = bookings.findQueueForUpdate(
          train.getId(), cancelledBooking.getJourneyDate(), cancelledBooking.getTravelClass(), BookingStatus.RAC);
      if (racQueue.isEmpty()) {
        break;
      }
      Booking next = racQueue.get(0);
      List<Passenger> queuedPassengers = passengers.findByBooking(next);
      if (queuedPassengers.size() > availableSeats) {
        break; // Preserve FIFO ordering; do not let a smaller party jump the queue.
      }
      next.setStatus(BookingStatus.CONFIRMED);
      next.setQueuePosition(null);
      next.setReservationLabel("CNF");
      queuedPassengers.forEach(passenger -> passenger.setStatus(BookingStatus.CONFIRMED));
      seatAllocationService.allocateSeats(next, queuedPassengers);
    }

    resequence(train, cancelledBooking, BookingStatus.RAC);

    long racPassengers = bookings.countQueuedPassengers(
        train.getId(), cancelledBooking.getJourneyDate(), cancelledBooking.getTravelClass(), BookingStatus.RAC);
    int racVacancies = Math.max(0, BookingService.RAC_LIMIT - Math.toIntExact(racPassengers));
    int nextRacPosition = bookings.findMaximumQueuePosition(
        train.getId(), cancelledBooking.getJourneyDate(), cancelledBooking.getTravelClass(), BookingStatus.RAC) + 1;
    List<Booking> waitlist = bookings.findQueueForUpdate(
        train.getId(), cancelledBooking.getJourneyDate(), cancelledBooking.getTravelClass(), BookingStatus.WAITLISTED);
    for (Booking waiting : waitlist) {
      int partySize = Math.toIntExact(passengers.countByBooking(waiting));
      if (partySize > racVacancies) {
        break; // FIFO, and bookings are the indivisible queue unit in the current model.
      }
      // Assign all RAC-indexed values before changing status. No query occurs
      // between these mutations, so FlushMode.AUTO cannot expose the old WL
      // position through the RAC partial unique index.
      waiting.setQueuePosition(nextRacPosition++);
      waiting.setReservationLabel("RAC " + waiting.getQueuePosition());
      waiting.setStatus(BookingStatus.RAC);
      passengers.findByBooking(waiting).forEach(passenger -> passenger.setStatus(BookingStatus.RAC));
      racVacancies -= partySize;
    }
    bookings.flush();
    resequence(train, cancelledBooking, BookingStatus.RAC);
    resequence(train, cancelledBooking, BookingStatus.WAITLISTED);
  }

  private void resequence(Train train, Booking scope, BookingStatus status) {
    // Move rows out of the target range first so immediate partial-unique-index
    // checks cannot collide while positions are compacted.
    bookings.moveQueueToTemporaryRange(
        train.getId(), scope.getJourneyDate(), scope.getTravelClass(), status.name());
    List<Booking> queue = bookings.findQueueForUpdate(
        train.getId(), scope.getJourneyDate(), scope.getTravelClass(), status);
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
    return new RefundQuoteDto(
        totalFare,
        BigDecimal.valueOf(0).setScale(2, RoundingMode.HALF_UP),
        totalFare,
        BigDecimal.valueOf(0).setScale(2, RoundingMode.HALF_UP),
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
