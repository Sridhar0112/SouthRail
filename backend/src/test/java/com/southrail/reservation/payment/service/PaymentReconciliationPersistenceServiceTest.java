package com.southrail.reservation.payment.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.southrail.reservation.entity.account.User;
import com.southrail.reservation.entity.booking.Booking;
import com.southrail.reservation.entity.payment.Payment;
import com.southrail.reservation.entity.payment.PaymentRefund;
import com.southrail.reservation.entity.payment.PaymentStatus;
import com.southrail.reservation.exception.ApiException;
import com.southrail.reservation.payment.gateway.PaymentGateway.GatewayPayment;
import com.southrail.reservation.repository.payment.PaymentRefundRepository;
import com.southrail.reservation.repository.payment.PaymentRepository;
import com.southrail.reservation.service.audit.AuditLogService;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

class PaymentReconciliationPersistenceServiceTest {
  private final UUID id = UUID.randomUUID();
  private final Instant cutoff = Instant.parse("2026-09-15T12:00:00Z");
  private Payment payment;
  private PaymentRepository payments;
  private PaymentRefundRepository refunds;
  private AuditLogService audit;
  private PaymentReconciliationPersistenceService persistence;

  @BeforeEach
  void setUp() {
    User user = new User();
    user.setId(UUID.randomUUID());
    user.setEmail("owner@example.com");
    Booking booking = new Booking();
    booking.setId(UUID.randomUUID());
    booking.setUser(user);
    booking.setPnr("1234567890");
    booking.setTotalFare(new BigDecimal("1000.00"));
    payment = Payment.create(booking, "key");
    ReflectionTestUtils.setField(payment, "id", id);
    payment.orderCreated("order_1");
    ReflectionTestUtils.setField(payment, "providerPaymentId", "pay_1");
    payment.setCreatedAt(cutoff.minusSeconds(600));
    payment.setUpdatedAt(cutoff.minusSeconds(600));
    payments = mock(PaymentRepository.class);
    refunds = mock(PaymentRefundRepository.class);
    audit = mock(AuditLogService.class);
    when(payments.findByIdForUpdate(id)).thenReturn(Optional.of(payment));
    when(payments.findByProviderPaymentId("pay_1")).thenReturn(Optional.of(payment));
    when(refunds.findByPaymentId(id)).thenReturn(Optional.empty());
    persistence = new PaymentReconciliationPersistenceService(payments, refunds, audit);
  }

  @Test
  void pendingCapturedBecomesCaptured() {
    assertThat(persistence.apply(id, remote("captured"), cutoff)).isTrue();
    assertThat(payment.getStatus()).isEqualTo(PaymentStatus.CAPTURED);
  }

  @Test
  void authorizedCapturedBecomesCaptured() {
    payment.authorized("pay_1");
    payment.setUpdatedAt(cutoff.minusSeconds(600));
    assertThat(persistence.apply(id, remote("captured"), cutoff)).isTrue();
    assertThat(payment.getStatus()).isEqualTo(PaymentStatus.CAPTURED);
  }

  @Test
  void pendingAndAuthorizedCanReconcileProviderFailure() {
    assertThat(persistence.apply(id, remote("failed"), cutoff)).isTrue();
    assertThat(payment.getStatus()).isEqualTo(PaymentStatus.FAILED);

    setUp();
    payment.authorized("pay_1");
    payment.setUpdatedAt(cutoff.minusSeconds(600));
    assertThat(persistence.apply(id, remote("failed"), cutoff)).isTrue();
    assertThat(payment.getFailureCode()).isEqualTo("PROVIDER_PAYMENT_FAILED");
  }

  @Test
  void sameStateIsNoOpWithoutAuditNoise() {
    payment.authorized("pay_1");
    payment.setUpdatedAt(cutoff.minusSeconds(600));
    assertThat(persistence.apply(id, remote("authorized"), cutoff)).isFalse();
    verify(audit, never()).log(
        org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any(),
        org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any(),
        org.mockito.ArgumentMatchers.any());
  }

  @Test
  void rejectsEveryProviderIdentityAndValueMismatch() {
    assertMismatch(new GatewayPayment("pay_other", "order_1", 100000, "INR", "captured"));
    assertMismatch(new GatewayPayment("pay_1", "order_other", 100000, "INR", "captured"));
    assertMismatch(new GatewayPayment("pay_1", "order_1", 99999, "INR", "captured"));
    assertMismatch(new GatewayPayment("pay_1", "order_1", 100000, "USD", "captured"));
  }

  @Test
  void captureActivatesExistingRefundWithoutCreatingAnother() {
    when(refunds.findByPaymentId(id)).thenReturn(Optional.of(mock(PaymentRefund.class)));
    assertThat(persistence.apply(id, remote("captured"), cutoff)).isTrue();
    assertThat(payment.getStatus()).isEqualTo(PaymentStatus.REFUND_PENDING);
    verify(refunds).findByPaymentId(id);
    verify(refunds, never()).save(org.mockito.ArgumentMatchers.any());
  }

  @Test
  void terminalPaymentsNeverRegress() {
    payment.captured("pay_1");
    payment.setUpdatedAt(cutoff.minusSeconds(600));
    assertThat(persistence.apply(id, remote("failed"), cutoff)).isFalse();
    assertThat(payment.getStatus()).isEqualTo(PaymentStatus.CAPTURED);
  }

  private GatewayPayment remote(String status) {
    return new GatewayPayment("pay_1", "order_1", 100000, "INR", status);
  }

  private void assertMismatch(GatewayPayment remote) {
    assertThatThrownBy(() -> persistence.apply(id, remote, cutoff))
        .isInstanceOf(ApiException.class);
    assertThat(payment.getStatus()).isEqualTo(PaymentStatus.PENDING);
  }
}
