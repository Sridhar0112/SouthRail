package com.southrail.reservation.payment.service;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.southrail.reservation.config.properties.RazorpayProperties;
import com.southrail.reservation.payment.gateway.PaymentGateway;
import com.southrail.reservation.repository.payment.PaymentRefundRepository;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class RefundDispatcherTest {
  @Test
  void providerFailureIsMarkedFailedAndCanBeRetried() {
    UUID refundId = UUID.randomUUID();
    RefundPersistenceService persistence = mock(RefundPersistenceService.class);
    PaymentGateway gateway = mock(PaymentGateway.class);
    RefundPersistenceService.RefundCommand command = new RefundPersistenceService.RefundCommand(
        refundId, "pay_1", new BigDecimal("750.00"), "refund-key");
    when(persistence.claim(org.mockito.ArgumentMatchers.eq(refundId),
        org.mockito.ArgumentMatchers.any())).thenReturn(command, command);
    when(gateway.initiateRefund("pay_1", 75000, "refund-key"))
        .thenThrow(new IllegalStateException("provider unavailable"))
        .thenReturn(new PaymentGateway.GatewayRefund("refund_1", 75000, "processed"));
    RefundDispatcher dispatcher = dispatcher(gateway, persistence);

    dispatcher.dispatch(refundId, Instant.now());
    dispatcher.dispatch(refundId, Instant.now());

    verify(persistence).providerFailed(refundId);
    verify(persistence).providerAccepted(refundId, "refund_1", true);
    verify(gateway, times(2)).initiateRefund("pay_1", 75000, "refund-key");
  }

  @Test
  void unclaimedDuplicateDoesNotCallProvider() {
    UUID refundId = UUID.randomUUID();
    RefundPersistenceService persistence = mock(RefundPersistenceService.class);
    PaymentGateway gateway = mock(PaymentGateway.class);
    when(persistence.claim(org.mockito.ArgumentMatchers.eq(refundId),
        org.mockito.ArgumentMatchers.any())).thenReturn(null);

    dispatcher(gateway, persistence).dispatch(refundId, Instant.now());

    verify(gateway, never()).initiateRefund(
        org.mockito.ArgumentMatchers.anyString(),
        org.mockito.ArgumentMatchers.anyLong(),
        org.mockito.ArgumentMatchers.anyString());
  }

  private RefundDispatcher dispatcher(
      PaymentGateway gateway, RefundPersistenceService persistence) {
    return new RefundDispatcher(
        mock(PaymentRefundRepository.class),
        gateway,
        new RazorpayProperties(true, "key", "secret", "webhook", "https://example.invalid"),
        persistence);
  }
}
