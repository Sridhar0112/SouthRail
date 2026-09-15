package com.southrail.reservation.payment.service;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.southrail.reservation.config.properties.PaymentReconciliationProperties;
import com.southrail.reservation.config.properties.RazorpayProperties;
import com.southrail.reservation.payment.gateway.PaymentGateway;
import com.southrail.reservation.repository.payment.PaymentRepository;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class PaymentReconciliationServiceTest {
  private final Instant now = Instant.parse("2026-09-15T12:00:00Z");
  private final PaymentRepository payments = mock(PaymentRepository.class);
  private final PaymentGateway gateway = mock(PaymentGateway.class);
  private final PaymentReconciliationPersistenceService persistence =
      mock(PaymentReconciliationPersistenceService.class);
  private final PaymentReconciliationProperties config =
      new PaymentReconciliationProperties(true, Duration.ofMinutes(1),
          Duration.ofMinutes(5), Duration.ofMinutes(30), 20);

  @Test
  void providerFailureLeavesLocalStateUntouchedForFutureRetry() {
    UUID id = UUID.randomUUID();
    Instant staleBefore = now.minus(Duration.ofMinutes(5));
    var context = new PaymentReconciliationPersistenceService.ReconciliationContext(
        id, "order_1", "pay_1", 100000, "INR");
    when(persistence.context(id, staleBefore)).thenReturn(Optional.of(context));
    when(gateway.fetchPayment("pay_1")).thenThrow(new RuntimeException("timeout"));

    service(true).reconcile(id, staleBefore, now.minus(Duration.ofMinutes(30)));

    verify(persistence, never()).apply(
        org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any(),
        org.mockito.ArgumentMatchers.any());
  }

  @Test
  void disabledProviderNeverRunsReconciliation() {
    service(false).reconcileStalePayments();
    verify(payments, never()).findReconciliationCandidates(
        org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any(),
        org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any());
  }

  @Test
  void orderWithoutStoredPaymentIdUsesOnlyOneUnambiguousProviderPayment() {
    UUID id = UUID.randomUUID();
    Instant staleBefore = now.minus(Duration.ofMinutes(5));
    var context = new PaymentReconciliationPersistenceService.ReconciliationContext(
        id, "order_1", null, 100000, "INR");
    var remote = new PaymentGateway.GatewayPayment(
        "pay_1", "order_1", 100000, "INR", "captured");
    when(persistence.context(id, staleBefore)).thenReturn(Optional.of(context));
    when(gateway.fetchPaymentsForOrder("order_1")).thenReturn(List.of(remote));

    service(true).reconcile(id, staleBefore, now.minus(Duration.ofMinutes(30)));

    verify(persistence).apply(id, remote, staleBefore);
  }

  private PaymentReconciliationService service(boolean providerEnabled) {
    return new PaymentReconciliationService(
        payments,
        gateway,
        new RazorpayProperties(providerEnabled, "key", "secret", "webhook", "https://example"),
        config,
        persistence,
        Clock.fixed(now, ZoneOffset.UTC));
  }
}
