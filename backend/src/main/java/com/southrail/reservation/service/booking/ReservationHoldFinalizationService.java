package com.southrail.reservation.service.booking;

import com.southrail.reservation.dto.booking.BookingDtos;
import com.southrail.reservation.entity.booking.*;
import com.southrail.reservation.entity.payment.*;
import com.southrail.reservation.repository.booking.ReservationHoldRepository;
import com.southrail.reservation.repository.payment.PaymentRefundRepository;
import com.southrail.reservation.service.audit.AuditLogService;
import java.time.Instant;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ReservationHoldFinalizationService {
  private final ReservationHoldRepository holds;
  private final ReservationHoldService holdService;
  private final BookingService bookingService;
  private final PaymentRefundRepository refunds;
  private final AuditLogService audit;

  public ReservationHoldFinalizationService(ReservationHoldRepository holds,
      ReservationHoldService holdService, BookingService bookingService,
      PaymentRefundRepository refunds, AuditLogService audit) {
    this.holds = holds; this.holdService = holdService; this.bookingService = bookingService;
    this.refunds = refunds; this.audit = audit;
  }

  @Transactional
  public void finalizeCaptured(Payment payment) {
    ReservationHold association = payment.getReservationHold();
    if (association == null) return;
    ReservationHold hold = holds.findByIdForUpdate(association.getId()).orElseThrow();
    if (hold.getStatus() == ReservationHoldStatus.CONFIRMED) {
      if (payment.getBooking() == null) payment.attachBooking(hold.getBooking());
      return;
    }
    // The transaction that first changes ACTIVE wins the capture/expiry race.
    // A capture observed after expiry is retained as a durable refund obligation.
    if (hold.getStatus() != ReservationHoldStatus.ACTIVE || !Instant.now().isBefore(hold.getExpiresAt())) {
      if (hold.getStatus() == ReservationHoldStatus.ACTIVE) hold.setStatus(ReservationHoldStatus.EXPIRED);
      requestExpiryRefund(payment, hold);
      return;
    }
    // Temporarily remove this hold's inventory effect. BookingService then uses
    // the existing scoped lock, queue policy, fare checks, allocation and outbox path.
    hold.setStatus(ReservationHoldStatus.CONFIRMED);
    BookingDtos.BookingResponse created = bookingService.create(
        hold.getUser().getEmail(), "reservation-hold:" + hold.getId(), holdService.bookingRequest(hold));
    Booking booking = bookingService.findById(UUID.fromString(created.getBookingId()));
    hold.setBooking(booking); payment.attachBooking(booking);
    audit.log(hold.getUser().getId(), hold.getUser().getEmail(), "RESERVATION_HOLD_CONFIRMED",
        "BOOKING", "Reservation hold " + hold.getId() + " converted to PNR " + booking.getPnr());
  }

  private void requestExpiryRefund(Payment payment, ReservationHold hold) {
    String key = "expired-hold:" + hold.getId();
    if (refunds.findByIdempotencyKey(key).isEmpty()) {
      refunds.save(PaymentRefund.request(payment, payment.getAmount(), key,
          "Reservation hold expired before capture was processed"));
    }
    if (payment.getStatus() == PaymentStatus.CAPTURED) payment.transition(PaymentStatus.REFUND_PENDING);
    audit.log(hold.getUser().getId(), hold.getUser().getEmail(), "HOLD_CAPTURE_REFUND_REQUESTED",
        "PAYMENT", "Refund requested for expired reservation hold " + hold.getId());
  }
}
