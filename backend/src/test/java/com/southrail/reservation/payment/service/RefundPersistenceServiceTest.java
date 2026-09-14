package com.southrail.reservation.payment.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.southrail.reservation.entity.booking.Booking;
import com.southrail.reservation.entity.payment.Payment;
import com.southrail.reservation.entity.payment.PaymentRefund;
import com.southrail.reservation.entity.payment.RefundStatus;
import com.southrail.reservation.repository.payment.PaymentRefundRepository;
import com.southrail.reservation.service.audit.AuditLogService;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class RefundPersistenceServiceTest {
  @Test
  void pendingPaymentRefundObligationIsNotClaimedBeforeCapture() {
    Booking booking = new Booking();
    booking.setTotalFare(new BigDecimal("1000.00"));
    Payment payment = Payment.create(booking, "payment-key");
    payment.orderCreated("order_1");
    PaymentRefund refund = PaymentRefund.request(
        payment, new BigDecimal("750.00"), "refund-key", "Cancellation");
    UUID refundId = UUID.randomUUID();
    PaymentRefundRepository refunds = mock(PaymentRefundRepository.class);
    when(refunds.findByIdForUpdate(refundId)).thenReturn(Optional.of(refund));
    RefundPersistenceService service = new RefundPersistenceService(
        refunds, mock(AuditLogService.class));

    assertThat(service.claim(refundId, Instant.now())).isNull();
    assertThat(refund.getStatus()).isEqualTo(RefundStatus.REQUESTED);
  }

  @Test
  void authorizedPaymentRefundObligationIsNotClaimedBeforeCapture() {
    Booking booking = new Booking();
    booking.setTotalFare(new BigDecimal("1000.00"));
    Payment payment = Payment.create(booking, "payment-key");
    payment.orderCreated("order_1");
    payment.authorized("pay_1");
    PaymentRefund refund = PaymentRefund.request(
        payment, new BigDecimal("750.00"), "refund-key", "Cancellation");
    UUID refundId = UUID.randomUUID();
    PaymentRefundRepository refunds = mock(PaymentRefundRepository.class);
    when(refunds.findByIdForUpdate(refundId)).thenReturn(Optional.of(refund));
    RefundPersistenceService service = new RefundPersistenceService(
        refunds, mock(AuditLogService.class));

    assertThat(service.claim(refundId, Instant.now())).isNull();
    assertThat(refund.getStatus()).isEqualTo(RefundStatus.REQUESTED);
  }
}
