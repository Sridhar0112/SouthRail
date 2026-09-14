package com.southrail.reservation.payment.service;

import com.southrail.reservation.entity.account.RoleName;
import com.southrail.reservation.entity.account.User;
import com.southrail.reservation.entity.booking.Booking;
import com.southrail.reservation.entity.payment.Payment;
import com.southrail.reservation.entity.payment.PaymentStatus;
import com.southrail.reservation.exception.ApiException;
import com.southrail.reservation.payment.dto.PaymentDtos.PaymentStatusResponse;
import com.southrail.reservation.payment.gateway.PaymentGateway.GatewayPayment;
import com.southrail.reservation.repository.account.UserRepository;
import com.southrail.reservation.repository.booking.BookingRepository;
import com.southrail.reservation.repository.payment.PaymentRepository;
import com.southrail.reservation.service.audit.AuditLogService;
import java.math.BigDecimal;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PaymentPersistenceService {
  private final PaymentRepository payments;
  private final BookingRepository bookings;
  private final UserRepository users;
  private final AuditLogService audit;

  public PaymentPersistenceService(
      PaymentRepository payments,
      BookingRepository bookings,
      UserRepository users,
      AuditLogService audit) {
    this.payments = payments;
    this.bookings = bookings;
    this.users = users;
    this.audit = audit;
  }

  @Transactional(propagation = Propagation.REQUIRES_NEW)
  public PreparedPayment prepare(String email, UUID bookingId, String idempotencyKey) {
    User user = user(email);
    Booking booking = bookings.findById(bookingId).orElseThrow(this::notFound);
    requireOwnership(user, booking);
    Optional<Payment> existing = payments.findByIdempotencyKey(idempotencyKey);
    if (existing.isPresent()) {
      if (!existing.get().getBooking().getId().equals(bookingId)) {
        throw new ApiException(
            HttpStatus.CONFLICT,
            "IDEMPOTENCY_KEY_REUSED",
            "Idempotency-Key has already been used for another booking");
      }
      return prepared(existing.get(), false);
    }
    if (payments.findFirstByBookingIdAndStatusOrderByCreatedAtDesc(
        bookingId, PaymentStatus.CAPTURED).isPresent()) {
      throw new ApiException(
          HttpStatus.CONFLICT, "PAYMENT_ALREADY_COMPLETED", "Booking is already paid");
    }
    Payment payment = payments.saveAndFlush(Payment.create(booking, idempotencyKey));
    return prepared(payment, true);
  }

  @Transactional(readOnly = true, propagation = Propagation.REQUIRES_NEW)
  public PreparedPayment findPrepared(String email, UUID bookingId, String idempotencyKey) {
    Payment payment = payments.findByIdempotencyKey(idempotencyKey).orElseThrow(this::notFound);
    requireOwnership(user(email), payment.getBooking());
    if (!payment.getBooking().getId().equals(bookingId)) {
      throw new ApiException(
          HttpStatus.CONFLICT,
          "IDEMPOTENCY_KEY_REUSED",
          "Idempotency-Key has already been used for another booking");
    }
    return prepared(payment, false);
  }

  @Transactional(propagation = Propagation.REQUIRES_NEW)
  public PreparedPayment completeOrder(UUID paymentId, String providerOrderId) {
    Payment payment = payments.findByIdForUpdate(paymentId).orElseThrow(this::notFound);
    if (payment.getStatus() == PaymentStatus.CREATED) {
      payment.orderCreated(providerOrderId);
      audit.log(
          payment.getBooking().getUser().getId(),
          payment.getBooking().getUser().getEmail(),
          "PAYMENT_ORDER_CREATED",
          "PAYMENT",
          "Payment " + payment.getId() + " order " + providerOrderId
              + " for PNR " + payment.getBooking().getPnr()
              + " amount " + payment.getAmount());
    } else if (!Objects.equals(payment.getProviderOrderId(), providerOrderId)) {
      throw new ApiException(
          HttpStatus.CONFLICT,
          "PAYMENT_ORDER_ALREADY_ASSIGNED",
          "Payment already has a different provider order");
    }
    return prepared(payment, false);
  }

  @Transactional(propagation = Propagation.REQUIRES_NEW)
  public void failCreatedOrder(UUID paymentId, String code, String description) {
    payments.findByIdForUpdate(paymentId).ifPresent(payment -> {
      if (payment.getStatus() == PaymentStatus.CREATED) {
        payment.failed(code, description);
      }
    });
  }

  @Transactional(readOnly = true)
  public VerificationContext verificationContext(String email, UUID paymentId) {
    Payment payment = payments.findById(paymentId).orElseThrow(this::notFound);
    requireOwnership(user(email), payment.getBooking());
    return new VerificationContext(
        payment.getId(),
        payment.getProviderOrderId(),
        payment.getProviderPaymentId(),
        payment.getAmount(),
        payment.getCurrency(),
        payment.getStatus());
  }

  @Transactional
  public PaymentStatusResponse applyVerification(
      String email, UUID paymentId, String requestedPaymentId, GatewayPayment remote) {
    Payment payment = payments.findByIdForUpdate(paymentId).orElseThrow(this::notFound);
    User user = user(email);
    requireOwnership(user, payment.getBooking());
    if (payment.getStatus() == PaymentStatus.CAPTURED) {
      if (Objects.equals(payment.getProviderPaymentId(), requestedPaymentId)) {
        return status(payment);
      }
      throw new ApiException(
          HttpStatus.CONFLICT, "PAYMENT_ALREADY_COMPLETED", "Payment is already completed");
    }
    payments.findByProviderPaymentId(requestedPaymentId)
        .filter(other -> !other.getId().equals(paymentId))
        .ifPresent(other -> {
          throw new ApiException(
              HttpStatus.CONFLICT,
              "PAYMENT_ALREADY_COMPLETED",
              "Provider payment is already associated with another payment");
        });
    validateRemote(payment, remote);
    if ("authorized".equals(remote.status())) {
      payment.authorized(remote.id());
    } else if ("captured".equals(remote.status())) {
      payment.captured(remote.id());
    } else {
      throw new ApiException(
          HttpStatus.CONFLICT, "PAYMENT_NOT_CAPTURED", "Provider has not captured this payment");
    }
    audit.log(
        user.getId(),
        email,
        payment.getStatus() == PaymentStatus.CAPTURED
            ? "PAYMENT_CAPTURED" : "PAYMENT_VERIFIED",
        "PAYMENT",
        "Payment " + payment.getId() + " verified for PNR " + payment.getBooking().getPnr());
    return status(payment);
  }

  @Transactional(readOnly = true)
  public PaymentStatusResponse get(String email, UUID paymentId) {
    Payment payment = payments.findById(paymentId).orElseThrow(this::notFound);
    requireOwnership(user(email), payment.getBooking());
    return status(payment);
  }

  private void validateRemote(Payment payment, GatewayPayment remote) {
    if (!Objects.equals(remote.id(), payment.getProviderPaymentId())
        && payment.getProviderPaymentId() != null) {
      throw paymentMismatch("Provider payment ID did not match");
    }
    if (!Objects.equals(remote.orderId(), payment.getProviderOrderId())
        || remote.amount() != PaymentService.toMinorUnits(payment.getAmount())
        || !payment.getCurrency().equals(remote.currency())) {
      throw paymentMismatch("Provider payment details did not match the order");
    }
  }

  private PreparedPayment prepared(Payment payment, boolean created) {
    return new PreparedPayment(
        payment.getId(),
        payment.getBooking().getId(),
        payment.getBooking().getPnr(),
        payment.getAmount(),
        payment.getCurrency(),
        payment.getStatus(),
        payment.getProviderOrderId(),
        payment.getIdempotencyKey(),
        created);
  }

  private PaymentStatusResponse status(Payment payment) {
    return new PaymentStatusResponse(
        payment.getId(),
        payment.getBooking().getId(),
        payment.getAmount(),
        payment.getCurrency(),
        payment.getStatus(),
        payment.getProviderOrderId(),
        payment.getProviderPaymentId());
  }

  private User user(String email) {
    return users.findByEmailIgnoreCase(email)
        .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "User not found"));
  }

  private void requireOwnership(User user, Booking booking) {
    if (!booking.getUser().getId().equals(user.getId())
        && !user.getRoles().contains(RoleName.ROLE_ADMIN)) {
      throw new ApiException(
          HttpStatus.FORBIDDEN, "PAYMENT_ACCESS_DENIED", "Payment does not belong to this user");
    }
  }

  private ApiException notFound() {
    return new ApiException(HttpStatus.NOT_FOUND, "PAYMENT_NOT_FOUND", "Payment was not found");
  }

  private ApiException paymentMismatch(String message) {
    return new ApiException(HttpStatus.BAD_REQUEST, "PAYMENT_AMOUNT_MISMATCH", message);
  }

  public record PreparedPayment(
      UUID id,
      UUID bookingId,
      String pnr,
      BigDecimal amount,
      String currency,
      PaymentStatus status,
      String providerOrderId,
      String idempotencyKey,
      boolean created) {}

  public record VerificationContext(
      UUID id,
      String providerOrderId,
      String providerPaymentId,
      BigDecimal amount,
      String currency,
      PaymentStatus status) {}
}
