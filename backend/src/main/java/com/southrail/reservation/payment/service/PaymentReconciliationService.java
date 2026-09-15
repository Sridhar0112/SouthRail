package com.southrail.reservation.payment.service;

import com.southrail.reservation.config.properties.PaymentReconciliationProperties;
import com.southrail.reservation.config.properties.RazorpayProperties;
import com.southrail.reservation.entity.payment.PaymentStatus;
import com.southrail.reservation.payment.gateway.PaymentGateway;
import com.southrail.reservation.repository.payment.PaymentRepository;
import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.PageRequest;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class PaymentReconciliationService {
  private static final Logger log = LoggerFactory.getLogger(PaymentReconciliationService.class);

  private final PaymentRepository payments;
  private final PaymentGateway gateway;
  private final RazorpayProperties razorpay;
  private final PaymentReconciliationProperties config;
  private final PaymentReconciliationPersistenceService persistence;
  private final Clock clock;

  public PaymentReconciliationService(
      PaymentRepository payments,
      PaymentGateway gateway,
      RazorpayProperties razorpay,
      PaymentReconciliationProperties config,
      PaymentReconciliationPersistenceService persistence) {
    this(payments, gateway, razorpay, config, persistence, Clock.systemUTC());
  }

  PaymentReconciliationService(
      PaymentRepository payments,
      PaymentGateway gateway,
      RazorpayProperties razorpay,
      PaymentReconciliationProperties config,
      PaymentReconciliationPersistenceService persistence,
      Clock clock) {
    this.payments = payments;
    this.gateway = gateway;
    this.razorpay = razorpay;
    this.config = config;
    this.persistence = persistence;
    this.clock = clock;
  }

  @Scheduled(fixedDelayString = "${razorpay.reconciliation.delay:PT1M}")
  public void reconcileStalePayments() {
    if (!razorpay.enabled() || !config.enabled()) {
      return;
    }
    Instant now = clock.instant();
    Instant staleBefore = now.minus(config.staleAfter());
    Instant creationExpiredBefore = now.minus(config.creationExpiry());
    List<UUID> candidates = payments.findReconciliationCandidates(
        creationExpiredBefore,
        List.of(PaymentStatus.PENDING, PaymentStatus.AUTHORIZED),
        staleBefore,
        PageRequest.of(0, config.batchSize()));
    candidates.forEach(id -> reconcile(id, staleBefore, creationExpiredBefore));
  }

  void reconcile(UUID id, Instant staleBefore, Instant creationExpiredBefore) {
    try {
      if (persistence.expireCreated(id, creationExpiredBefore)) {
        return;
      }
      persistence.context(id, staleBefore).ifPresent(context -> {
        try {
          PaymentGateway.GatewayPayment remote = remotePayment(context);
          if (remote != null) {
            persistence.apply(context.paymentId(), remote, staleBefore);
          }
        } catch (RuntimeException exception) {
          log.warn("payment_reconciliation_failed paymentId={} reason={}",
              id, exception.getClass().getSimpleName());
        }
      });
    } catch (RuntimeException exception) {
      log.warn("payment_reconciliation_failed paymentId={} reason={}",
          id, exception.getClass().getSimpleName());
    }
  }

  private PaymentGateway.GatewayPayment remotePayment(
      PaymentReconciliationPersistenceService.ReconciliationContext context) {
    if (context.providerPaymentId() != null && !context.providerPaymentId().isBlank()) {
      return gateway.fetchPayment(context.providerPaymentId());
    }
    List<PaymentGateway.GatewayPayment> matching = gateway
        .fetchPaymentsForOrder(context.providerOrderId()).stream()
        .filter(remote -> context.providerOrderId().equals(remote.orderId()))
        .filter(remote -> context.amount() == remote.amount())
        .filter(remote -> context.currency().equals(remote.currency()))
        .filter(remote -> List.of("authorized", "captured", "failed").contains(remote.status()))
        .toList();
    return matching.size() == 1 ? matching.getFirst() : null;
  }
}
