package com.southrail.reservation.payment.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.southrail.reservation.config.properties.RazorpayProperties;
import com.southrail.reservation.entity.payment.Payment;
import com.southrail.reservation.entity.payment.PaymentRefund;
import com.southrail.reservation.entity.payment.PaymentStatus;
import com.southrail.reservation.entity.payment.PaymentWebhookEvent;
import com.southrail.reservation.entity.payment.RefundStatus;
import com.southrail.reservation.exception.ApiException;
import com.southrail.reservation.repository.payment.PaymentRefundRepository;
import com.southrail.reservation.repository.payment.PaymentRepository;
import com.southrail.reservation.repository.payment.PaymentWebhookEventRepository;
import com.southrail.reservation.service.audit.AuditLogService;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.Locale;
import java.util.Objects;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;

@Service
public class PaymentWebhookService {
  static final String EVENT_CONSTRAINT = "uq_webhook_provider_event";

  private final RazorpayProperties config;
  private final ObjectMapper json;
  private final PaymentWebhookEventRepository events;
  private final PaymentRepository payments;
  private final PaymentRefundRepository refunds;
  private final AuditLogService audit;
  private final TransactionTemplate transactions;

  public PaymentWebhookService(
      RazorpayProperties config,
      ObjectMapper json,
      PaymentWebhookEventRepository events,
      PaymentRepository payments,
      PaymentRefundRepository refunds,
      AuditLogService audit,
      TransactionTemplate transactions) {
    this.config = config;
    this.json = json;
    this.events = events;
    this.payments = payments;
    this.refunds = refunds;
    this.audit = audit;
    this.transactions = transactions;
  }

  public void receive(byte[] raw, String signature, String suppliedId) {
    String body = new String(raw, StandardCharsets.UTF_8);
    if (!RazorpaySignatures.verify(body, signature, config.webhookSecret())) {
      throw new ApiException(
          HttpStatus.BAD_REQUEST,
          "PAYMENT_SIGNATURE_INVALID",
          "Webhook signature is invalid");
    }

    WebhookPayload payload = parse(raw, suppliedId);
    try {
      transactions.executeWithoutResult(status -> process(payload));
    } catch (DataIntegrityViolationException exception) {
      if (!isDuplicateEvent(exception)) {
        throw exception;
      }
      // The unique constraint is the authority. A concurrent delivery that lost
      // the insert race has already been accepted and processed by the winner.
    }
  }

  private WebhookPayload parse(byte[] raw, String suppliedId) {
    try {
      JsonNode root = json.readTree(raw);
      String eventType = root.path("event").asText();
      if (eventType.isBlank()) {
        throw malformed();
      }
      String eventId = suppliedId == null || suppliedId.isBlank() ? hash(raw) : suppliedId;
      if (eventId.length() > 100) {
        throw malformed();
      }
      return new WebhookPayload(
          eventId,
          eventType,
          root.path("payload").path("payment").path("entity"),
          root.path("payload").path("refund").path("entity"));
    } catch (ApiException exception) {
      throw exception;
    } catch (Exception exception) {
      throw malformed();
    }
  }

  private void process(WebhookPayload payload) {
    PaymentWebhookEvent event = events.saveAndFlush(
        PaymentWebhookEvent.received(payload.eventId(), payload.eventType()));
    boolean handled = switch (payload.eventType()) {
      case "payment.authorized", "payment.captured", "payment.failed" ->
          handlePayment(payload.eventType(), payload.payment());
      case "refund.processed", "refund.failed" ->
          handleRefund(payload.eventType(), payload.refund());
      default -> false;
    };
    if (handled) {
      event.processed();
      audit.log(
          null,
          "razorpay-webhook",
          "PAYMENT_WEBHOOK_PROCESSED",
          "PAYMENT",
          "Processed " + payload.eventType() + " event " + payload.eventId());
    } else {
      event.ignored();
    }
  }

  private boolean handlePayment(String eventType, JsonNode node) {
    String orderId = node.path("order_id").asText();
    if (orderId.isBlank()) {
      return false;
    }
    Payment payment = payments.findByProviderOrderIdForUpdate(orderId).orElse(null);
    if (payment == null) {
      return false;
    }
    validatePaymentPayload(payment, node);
    String paymentId = node.path("id").asText();
    validateProviderPaymentId(payment, paymentId);
    if ("payment.captured".equals(eventType)
        && (payment.getStatus() == PaymentStatus.PENDING
            || payment.getStatus() == PaymentStatus.AUTHORIZED)) {
      payment.captured(paymentId);
      activateRefundAfterCapture(payment);
    } else if ("payment.authorized".equals(eventType)
        && payment.getStatus() == PaymentStatus.PENDING) {
      payment.authorized(paymentId);
    } else if ("payment.failed".equals(eventType)
        && (payment.getStatus() == PaymentStatus.PENDING
            || payment.getStatus() == PaymentStatus.AUTHORIZED)) {
      payment.failed(
          node.path("error_code").asText(null),
          node.path("error_description").asText(null));
    }
    return true;
  }

  private void validateProviderPaymentId(Payment payment, String incomingPaymentId) {
    if (payment.getProviderPaymentId() != null
        && !payment.getProviderPaymentId().equals(incomingPaymentId)) {
      throw new ApiException(
          HttpStatus.CONFLICT,
          "PAYMENT_PROVIDER_ID_MISMATCH",
          "Webhook payment ID did not match the existing payment association");
    }
    payments.findByProviderPaymentId(incomingPaymentId)
        .filter(existing -> existing != payment
            && (payment.getId() == null || !payment.getId().equals(existing.getId())))
        .ifPresent(existing -> {
          throw new ApiException(
              HttpStatus.CONFLICT,
              "PAYMENT_PROVIDER_ID_ALREADY_USED",
              "Provider payment ID is already associated with another payment");
        });
  }

  private void activateRefundAfterCapture(Payment payment) {
    if (refunds.findByPaymentId(payment.getId()).isPresent()
        && payment.getStatus() == PaymentStatus.CAPTURED) {
      payment.transition(PaymentStatus.REFUND_PENDING);
    }
  }

  private void validatePaymentPayload(Payment payment, JsonNode node) {
    long expectedAmount = PaymentService.toMinorUnits(payment.getAmount());
    long actualAmount = node.path("amount").asLong(Long.MIN_VALUE);
    String actualCurrency = node.path("currency").asText().toUpperCase(Locale.ROOT);
    if (actualAmount != expectedAmount
        || !Objects.equals(payment.getCurrency(), actualCurrency)
        || !Objects.equals(payment.getProviderOrderId(), node.path("order_id").asText())) {
      throw new ApiException(
          HttpStatus.BAD_REQUEST,
          "PAYMENT_AMOUNT_MISMATCH",
          "Webhook payment details did not match the expected payment");
    }
    if (node.path("id").asText().isBlank()) {
      throw malformed();
    }
  }

  private boolean handleRefund(String eventType, JsonNode node) {
    PaymentRefund refund = refunds.findByProviderRefundIdForUpdate(
        node.path("id").asText()).orElse(null);
    if (refund == null) {
      return false;
    }
    if ("refund.processed".equals(eventType) && refund.getStatus() != RefundStatus.PROCESSED) {
      refund.processed(node.path("id").asText());
      Payment payment = refund.getPayment();
      if (payment.getStatus() == PaymentStatus.REFUND_PENDING) {
        payment.transition(refund.getAmount().compareTo(payment.getAmount()) >= 0
            ? PaymentStatus.REFUNDED : PaymentStatus.PARTIALLY_REFUNDED);
      }
    } else if ("refund.failed".equals(eventType)
        && refund.getStatus() != RefundStatus.FAILED
        && refund.getStatus() != RefundStatus.PROCESSED) {
      refund.failed();
    }
    return true;
  }

  private boolean isDuplicateEvent(DataIntegrityViolationException exception) {
    Throwable current = exception;
    while (current != null) {
      String message = current.getMessage();
      if (message != null
          && message.toLowerCase(Locale.ROOT).contains(EVENT_CONSTRAINT)) {
        return true;
      }
      current = current.getCause();
    }
    return false;
  }

  private String hash(byte[] raw) throws NoSuchAlgorithmException {
    return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(raw));
  }

  private ApiException malformed() {
    return new ApiException(
        HttpStatus.BAD_REQUEST, "MALFORMED_WEBHOOK", "Webhook payload is malformed");
  }

  private record WebhookPayload(
      String eventId, String eventType, JsonNode payment, JsonNode refund) {}
}
