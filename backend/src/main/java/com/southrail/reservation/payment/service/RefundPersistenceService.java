package com.southrail.reservation.payment.service;

import com.southrail.reservation.entity.payment.Payment;
import com.southrail.reservation.entity.payment.PaymentRefund;
import com.southrail.reservation.entity.payment.PaymentStatus;
import com.southrail.reservation.entity.payment.RefundStatus;
import com.southrail.reservation.repository.payment.PaymentRefundRepository;
import com.southrail.reservation.service.audit.AuditLogService;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Service
public class RefundPersistenceService {
  private final PaymentRefundRepository refunds;
  private final AuditLogService audit;

  public RefundPersistenceService(PaymentRefundRepository refunds, AuditLogService audit) {
    this.refunds = refunds;
    this.audit = audit;
  }

  @Transactional(propagation = Propagation.REQUIRES_NEW)
  public RefundCommand claim(UUID refundId, Instant staleBefore) {
    PaymentRefund refund = refunds.findByIdForUpdate(refundId).orElse(null);
    if (refund == null || refund.getStatus() == RefundStatus.PROCESSED) {
      return null;
    }
    if (refund.getStatus() == RefundStatus.PROCESSING
        && !refund.getUpdatedAt().isBefore(staleBefore)) {
      return null;
    }
    if (refund.getPayment().getProviderPaymentId() == null) {
      return null;
    }
    refund.processing();
    // A same-state stale claim still needs a new lease timestamp.
    refund.setUpdatedAt(Instant.now());
    return new RefundCommand(
        refund.getId(),
        refund.getPayment().getProviderPaymentId(),
        refund.getAmount(),
        refund.getIdempotencyKey());
  }

  @Transactional(propagation = Propagation.REQUIRES_NEW)
  public void providerAccepted(UUID refundId, String providerRefundId, boolean processed) {
    PaymentRefund refund = refunds.findByIdForUpdate(refundId).orElse(null);
    if (refund == null || refund.getStatus() == RefundStatus.PROCESSED) {
      return;
    }
    if (processed) {
      refund.processed(providerRefundId);
      Payment payment = refund.getPayment();
      payment.transition(refund.getAmount().compareTo(payment.getAmount()) >= 0
          ? PaymentStatus.REFUNDED : PaymentStatus.PARTIALLY_REFUNDED);
      audit.log(
          refund.getBooking().getUser().getId(),
          refund.getBooking().getUser().getEmail(),
          "REFUND_PROCESSED",
          "PAYMENT",
          "Refund " + refund.getId() + " processed for PNR " + refund.getBooking().getPnr());
    } else {
      refund.providerAccepted(providerRefundId);
    }
  }

  @Transactional(propagation = Propagation.REQUIRES_NEW)
  public void providerFailed(UUID refundId) {
    PaymentRefund refund = refunds.findByIdForUpdate(refundId).orElse(null);
    if (refund == null || refund.getStatus() != RefundStatus.PROCESSING) {
      return;
    }
    refund.failed();
    audit.log(
        refund.getBooking().getUser().getId(),
        refund.getBooking().getUser().getEmail(),
        "REFUND_FAILED",
        "PAYMENT",
        "Refund " + refund.getId() + " remains retryable");
  }

  public record RefundCommand(
      UUID refundId, String providerPaymentId, BigDecimal amount, String idempotencyKey) {}
}
