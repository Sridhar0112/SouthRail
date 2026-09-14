package com.southrail.reservation.payment.service;

import com.southrail.reservation.config.properties.RazorpayProperties;
import com.southrail.reservation.entity.booking.Booking;
import com.southrail.reservation.entity.payment.Payment;
import com.southrail.reservation.entity.payment.PaymentRefund;
import com.southrail.reservation.entity.payment.PaymentStatus;
import com.southrail.reservation.exception.ApiException;
import com.southrail.reservation.payment.dto.PaymentDtos.CreatePaymentOrderResponse;
import com.southrail.reservation.payment.dto.PaymentDtos.PaymentStatusResponse;
import com.southrail.reservation.payment.dto.PaymentDtos.VerificationRequest;
import com.southrail.reservation.payment.gateway.PaymentGateway;
import com.southrail.reservation.repository.payment.PaymentRefundRepository;
import com.southrail.reservation.repository.payment.PaymentRepository;
import com.southrail.reservation.service.audit.AuditLogService;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PaymentService {
  private final PaymentRepository payments;
  private final PaymentRefundRepository refunds;
  private final PaymentGateway gateway;
  private final RazorpayProperties config;
  private final AuditLogService audit;
  private final PaymentPersistenceService persistence;

  public PaymentService(
      PaymentRepository payments,
      PaymentRefundRepository refunds,
      PaymentGateway gateway,
      RazorpayProperties config,
      AuditLogService audit,
      PaymentPersistenceService persistence) {
    this.payments = payments;
    this.refunds = refunds;
    this.gateway = gateway;
    this.config = config;
    this.audit = audit;
    this.persistence = persistence;
  }

  public static long toMinorUnits(BigDecimal amount) {
    try {
      return amount.setScale(2, RoundingMode.UNNECESSARY).movePointRight(2).longValueExact();
    } catch (ArithmeticException exception) {
      throw new IllegalArgumentException("Amount must have at most two decimal places");
    }
  }

  public CreatePaymentOrderResponse createOrder(
      String email, UUID bookingId, String requestKey) {
    String idempotencyKey = normalizeIdempotencyKey(email, requestKey);
    PaymentPersistenceService.PreparedPayment prepared;
    try {
      prepared = persistence.prepare(email, bookingId, idempotencyKey);
    } catch (DataIntegrityViolationException duplicate) {
      prepared = persistence.resolveCreateConflict(email, bookingId, idempotencyKey);
    }

    if (!prepared.created()) {
      return existingOrder(prepared);
    }

    long amount = toMinorUnits(prepared.amount());
    try {
      PaymentGateway.GatewayOrder order = gateway.createOrder(
          amount,
          prepared.currency(),
          prepared.id().toString(),
          Map.of("booking_id", bookingId.toString(), "pnr", prepared.pnr()));
      if (order.id() == null || order.id().isBlank()
          || order.amount() != amount
          || !prepared.currency().equals(order.currency())) {
        persistence.failCreatedOrder(
            prepared.id(), "PAYMENT_AMOUNT_MISMATCH", "Provider order amount or currency mismatch");
        throw new ApiException(
            HttpStatus.BAD_GATEWAY,
            "PAYMENT_AMOUNT_MISMATCH",
            "Provider order amount or currency did not match");
      }
      return response(persistence.completeOrder(prepared.id(), order.id()));
    } catch (ApiException exception) {
      persistence.failCreatedOrder(
          prepared.id(), exception.errorCode(), "Provider order creation failed");
      throw exception;
    } catch (RuntimeException exception) {
      persistence.failCreatedOrder(
          prepared.id(), "RAZORPAY_UNAVAILABLE", "Provider order creation failed");
      throw exception;
    }
  }

  public PaymentStatusResponse verify(
      String email, UUID paymentId, VerificationRequest request) {
    PaymentPersistenceService.VerificationContext context =
        persistence.verificationContext(email, paymentId);
    if (!Objects.equals(context.providerOrderId(), request.razorpayOrderId())) {
      throw new ApiException(
          HttpStatus.BAD_REQUEST, "PAYMENT_ORDER_MISMATCH", "Payment order does not match");
    }
    if (context.status() == PaymentStatus.CAPTURED
        && Objects.equals(context.providerPaymentId(), request.razorpayPaymentId())) {
      return persistence.get(email, paymentId);
    }
    if (!RazorpaySignatures.verify(
        request.razorpayOrderId() + "|" + request.razorpayPaymentId(),
        request.razorpaySignature(),
        config.keySecret())) {
      throw new ApiException(
          HttpStatus.BAD_REQUEST,
          "PAYMENT_SIGNATURE_INVALID",
          "Payment signature is invalid");
    }

    PaymentGateway.GatewayPayment remote = gateway.fetchPayment(request.razorpayPaymentId());
    if (!request.razorpayPaymentId().equals(remote.id())) {
      throw new ApiException(
          HttpStatus.BAD_REQUEST,
          "PAYMENT_PROVIDER_ID_MISMATCH",
          "Provider returned a different payment ID");
    }
    return persistence.applyVerification(email, paymentId, request.razorpayPaymentId(), remote);
  }

  public PaymentStatusResponse get(String email, UUID paymentId) {
    return persistence.get(email, paymentId);
  }

  @Transactional
  public PaymentRefund createRefundObligation(Booking booking, BigDecimal amount) {
    if (amount == null || amount.signum() <= 0) {
      return null;
    }
    Optional<Payment> financialPayment = payments.findFinancialPaymentForUpdate(
        booking.getId(), List.of(PaymentStatus.AUTHORIZED, PaymentStatus.CAPTURED));
    if (financialPayment.isEmpty()) {
      return null;
    }
    String key = "cancellation:" + booking.getId();
    Optional<PaymentRefund> existing = refunds.findByIdempotencyKey(key);
    if (existing.isPresent()) {
      return existing.get();
    }
    Payment payment = financialPayment.get();
    PaymentRefund refund = refunds.save(PaymentRefund.request(
        payment, amount, key, "SouthRail cancellation refund"));
    if (payment.getStatus() == PaymentStatus.CAPTURED) {
      payment.transition(PaymentStatus.REFUND_PENDING);
    }
    audit.log(
        booking.getUser().getId(),
        booking.getUser().getEmail(),
        "REFUND_REQUESTED",
        "PAYMENT",
        "Refund " + refund.getId() + " for PNR " + booking.getPnr() + " amount " + amount);
    return refund;
  }

  private String normalizeIdempotencyKey(String email, String requestKey) {
    if (requestKey == null || requestKey.isBlank() || requestKey.length() > 128) {
      throw new ApiException(
          HttpStatus.BAD_REQUEST,
          "INVALID_IDEMPOTENCY_KEY",
          "A valid Idempotency-Key is required");
    }
    String scopedKey = email.toLowerCase(Locale.ROOT) + ":" + requestKey.trim();
    try {
      return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
          .digest(scopedKey.getBytes(StandardCharsets.UTF_8)));
    } catch (NoSuchAlgorithmException exception) {
      throw new IllegalStateException("SHA-256 is unavailable", exception);
    }
  }

  private CreatePaymentOrderResponse existingOrder(
      PaymentPersistenceService.PreparedPayment payment) {
    if (payment.status() == PaymentStatus.CREATED) {
      throw new ApiException(
          HttpStatus.CONFLICT,
          "PAYMENT_ORDER_PENDING",
          "Payment order creation is already in progress; retry later");
    }
    if (payment.status() == PaymentStatus.FAILED) {
      throw new ApiException(
          HttpStatus.CONFLICT,
          "PAYMENT_ORDER_FAILED",
          "This payment attempt failed; retry with a new Idempotency-Key");
    }
    return response(payment);
  }

  private CreatePaymentOrderResponse response(
      PaymentPersistenceService.PreparedPayment payment) {
    if (payment.providerOrderId() == null) {
      throw new ApiException(
          HttpStatus.CONFLICT,
          "PAYMENT_ORDER_PENDING",
          "Payment order creation has not completed");
    }
    return new CreatePaymentOrderResponse(
        payment.id(),
        payment.providerOrderId(),
        config.keyId(),
        toMinorUnits(payment.amount()),
        payment.currency());
  }
}
