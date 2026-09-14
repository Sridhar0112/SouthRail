package com.southrail.reservation.payment.service;

import com.southrail.reservation.config.properties.RazorpayProperties;
import com.southrail.reservation.entity.payment.RefundStatus;
import com.southrail.reservation.payment.gateway.PaymentGateway;
import com.southrail.reservation.repository.payment.PaymentRefundRepository;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class RefundDispatcher {
  private static final Logger log = LoggerFactory.getLogger(RefundDispatcher.class);
  private static final Duration PROCESSING_LEASE = Duration.ofMinutes(5);

  private final PaymentRefundRepository refunds;
  private final PaymentGateway gateway;
  private final RazorpayProperties config;
  private final RefundPersistenceService persistence;

  public RefundDispatcher(
      PaymentRefundRepository refunds,
      PaymentGateway gateway,
      RazorpayProperties config,
      RefundPersistenceService persistence) {
    this.refunds = refunds;
    this.gateway = gateway;
    this.config = config;
    this.persistence = persistence;
  }

  @Scheduled(fixedDelayString = "${razorpay.refund-poll-delay:60000}")
  public void dispatch() {
    if (!config.enabled()) {
      return;
    }
    Instant staleBefore = Instant.now().minus(PROCESSING_LEASE);
    List<RefundStatus> statuses = List.of(
        RefundStatus.REQUESTED, RefundStatus.FAILED, RefundStatus.PROCESSING);
    refunds.findDispatchable(statuses, staleBefore).stream()
        .limit(20)
        .forEach(refund -> dispatch(refund.getId(), staleBefore));
  }

  void dispatch(java.util.UUID refundId, Instant staleBefore) {
    RefundPersistenceService.RefundCommand command = persistence.claim(refundId, staleBefore);
    if (command == null) {
      return;
    }
    try {
      PaymentGateway.GatewayRefund result = gateway.initiateRefund(
          command.providerPaymentId(),
          PaymentService.toMinorUnits(command.amount()),
          command.idempotencyKey());
      if (result.id() == null
          || result.id().isBlank()
          || result.amount() != PaymentService.toMinorUnits(command.amount())) {
        throw new IllegalStateException("Provider refund response did not match the request");
      }
      persistence.providerAccepted(
          command.refundId(), result.id(), "processed".equals(result.status()));
    } catch (RuntimeException exception) {
      persistence.providerFailed(command.refundId());
      log.warn("refund_dispatch_failed refundId={}", command.refundId());
    }
  }
}
