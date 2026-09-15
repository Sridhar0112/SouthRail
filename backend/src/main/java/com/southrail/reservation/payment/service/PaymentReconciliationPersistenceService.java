package com.southrail.reservation.payment.service;

import com.southrail.reservation.entity.payment.Payment;
import com.southrail.reservation.entity.payment.PaymentStatus;
import com.southrail.reservation.exception.ApiException;
import com.southrail.reservation.payment.gateway.PaymentGateway.GatewayPayment;
import com.southrail.reservation.repository.payment.PaymentRefundRepository;
import com.southrail.reservation.repository.payment.PaymentRepository;
import com.southrail.reservation.service.audit.AuditLogService;
import java.time.Instant;
import java.util.Locale;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PaymentReconciliationPersistenceService {
  private final PaymentRepository payments;
  private final PaymentRefundRepository refunds;
  private final AuditLogService audit;

  public PaymentReconciliationPersistenceService(
      PaymentRepository payments, PaymentRefundRepository refunds, AuditLogService audit) {
    this.payments = payments;
    this.refunds = refunds;
    this.audit = audit;
  }

  @Transactional(readOnly = true)
  public Optional<ReconciliationContext> context(UUID id, Instant staleBefore) {
    return payments.findById(id)
        .filter(payment -> (payment.getStatus() == PaymentStatus.PENDING
                || payment.getStatus() == PaymentStatus.AUTHORIZED)
            && payment.getUpdatedAt().isBefore(staleBefore)
            && payment.getProviderOrderId() != null
            && !payment.getProviderOrderId().isBlank())
        .map(payment -> new ReconciliationContext(
            payment.getId(), payment.getProviderOrderId(), payment.getProviderPaymentId(),
            PaymentService.toMinorUnits(payment.getAmount()), payment.getCurrency()));
  }

  @Transactional
  public boolean apply(UUID id, GatewayPayment remote, Instant staleBefore) {
    Payment payment = payments.findByIdForUpdate(id).orElse(null);
    if (payment == null
        || (payment.getStatus() != PaymentStatus.PENDING
            && payment.getStatus() != PaymentStatus.AUTHORIZED)
        || !payment.getUpdatedAt().isBefore(staleBefore)) {
      return false;
    }
    validate(payment, remote);
    PaymentStatus before = payment.getStatus();
    switch (remote.status()) {
      case "authorized" -> {
        if (before == PaymentStatus.PENDING) {
          payment.authorized(remote.id());
        }
      }
      case "captured" -> {
        payment.captured(remote.id());
        if (refunds.findByPaymentId(payment.getId()).isPresent()) {
          payment.transition(PaymentStatus.REFUND_PENDING);
        }
      }
      case "failed" -> payment.failed(
          "PROVIDER_PAYMENT_FAILED", "Provider reported that payment failed");
      default -> {
        return false;
      }
    }
    if (payment.getStatus() == before) {
      return false;
    }
    audit(payment, "PAYMENT_RECONCILED");
    return true;
  }

  private void validate(Payment payment, GatewayPayment remote) {
    if (payment.getProviderPaymentId() != null
        && !Objects.equals(payment.getProviderPaymentId(), remote.id())) {
      throw mismatch("Provider payment ID did not match");
    }
    if (!Objects.equals(payment.getProviderOrderId(), remote.orderId())) {
      throw mismatch("Provider order ID did not match");
    }
    if (remote.amount() != PaymentService.toMinorUnits(payment.getAmount())) {
      throw mismatch("Provider amount did not match");
    }
    String remoteCurrency = remote.currency() == null
        ? null : remote.currency().toUpperCase(Locale.ROOT);
    if (!Objects.equals(payment.getCurrency(), remoteCurrency)) {
      throw mismatch("Provider currency did not match");
    }
    payments.findByProviderPaymentId(remote.id())
        .filter(other -> !other.getId().equals(payment.getId()))
        .ifPresent(other -> {
          throw mismatch("Provider payment ID is already associated with another payment");
        });
  }

  private ApiException mismatch(String message) {
    return new ApiException(HttpStatus.BAD_REQUEST, "PAYMENT_RECONCILIATION_MISMATCH", message);
  }

  private void audit(Payment payment, String action) {
    audit.log(
        payment.getBooking().getUser().getId(),
        payment.getBooking().getUser().getEmail(),
        action,
        "PAYMENT",
        "Payment " + payment.getId() + " for PNR " + payment.getBooking().getPnr());
  }

  public record ReconciliationContext(
      UUID paymentId,
      String providerOrderId,
      String providerPaymentId,
      long amount,
      String currency) {}
}
