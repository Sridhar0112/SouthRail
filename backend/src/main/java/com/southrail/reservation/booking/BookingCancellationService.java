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
  public BookingCancellationService(BookingRepository bookings, UserRepository users,
      RefundCalculationService refundCalculationService, NotificationService notificationService,
      SeatAllocationService seatAllocationService,AuditLogService auditLogService) {
    this.bookings = bookings;
    this.users = users;
    this.refundCalculationService = refundCalculationService;
    this.notificationService = notificationService;
    this.seatAllocationService = seatAllocationService;
    this.auditLogService=auditLogService;
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
    Booking booking = findBookingForUpdate(pnr);
    validateBookingOwnership(currentUser, booking);
    validateBookingCanBeCancelled(booking);

    RefundQuoteDto quote = refundCalculationService.calculate(booking);
    booking.setStatus(BookingStatus.CANCELLED);
    seatAllocationService.releaseSeatsForBooking(booking);
    auditLogService.log(
            booking.getUser().getId(),
            booking.getUser().getEmail(),
            "BOOKING_CANCELLED",
            "BOOKING",
            "Ticket cancelled successfully with PNR: " + booking.getPnr()
    );
    try {
      notificationService.notifyBookingCancelled(booking.getUser(), booking, quote);
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
