package com.southrail.reservation.payment.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.southrail.reservation.entity.account.RoleName;
import com.southrail.reservation.entity.account.User;
import com.southrail.reservation.entity.booking.Booking;
import com.southrail.reservation.entity.booking.BookingStatus;
import com.southrail.reservation.entity.payment.Payment;
import com.southrail.reservation.entity.payment.PaymentStatus;
import com.southrail.reservation.exception.ApiException;
import com.southrail.reservation.payment.gateway.PaymentGateway;
import com.southrail.reservation.repository.account.UserRepository;
import com.southrail.reservation.repository.booking.BookingRepository;
import com.southrail.reservation.repository.payment.PaymentRepository;
import com.southrail.reservation.repository.payment.PaymentRefundRepository;
import com.southrail.reservation.service.audit.AuditLogService;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class PaymentPersistenceServiceTest {
  private final UUID paymentId = UUID.randomUUID();
  private Payment payment;
  private PaymentPersistenceService persistence;
  private PaymentRepository payments;
  private BookingRepository bookings;
  private Booking booking;

  @BeforeEach
  void setUp() {
    User user = new User();
    user.setId(UUID.randomUUID());
    user.setEmail("user@example.com");
    user.getRoles().add(RoleName.ROLE_USER);
    booking = new Booking();
    booking.setId(UUID.randomUUID());
    booking.setPnr("1234567890");
    booking.setUser(user);
    booking.setTotalFare(new BigDecimal("1000.00"));
    booking.setStatus(BookingStatus.CONFIRMED);
    payment = Payment.create(booking, "key");
    payment.orderCreated("order_1");

    payments = mock(PaymentRepository.class);
    bookings = mock(BookingRepository.class);
    UserRepository users = mock(UserRepository.class);
    when(payments.findByIdForUpdate(paymentId)).thenReturn(Optional.of(payment));
    when(payments.findByProviderPaymentId("pay_1")).thenReturn(Optional.empty());
    when(users.findByEmailIgnoreCase("user@example.com")).thenReturn(Optional.of(user));
    persistence = new PaymentPersistenceService(
        payments,
        bookings,
        users,
        mock(AuditLogService.class),
        mock(PaymentRefundRepository.class));
  }

  @Test
  void cancelledBookingCannotCreatePaymentAttempt() {
    booking.setStatus(BookingStatus.CANCELLED);
    when(bookings.findById(booking.getId())).thenReturn(Optional.of(booking));

    assertThatThrownBy(() -> persistence.prepare(
        "user@example.com", booking.getId(), "idempotency-key"))
        .isInstanceOf(ApiException.class)
        .satisfies(exception -> assertThat(((ApiException) exception).errorCode())
            .isEqualTo("BOOKING_CANCELLED"));
  }

  @Test
  void differentKeyCannotCreateSecondActiveAttempt() {
    when(bookings.findById(booking.getId())).thenReturn(Optional.of(booking));
    when(payments.findFirstByBookingIdAndStatusInOrderByCreatedAtDesc(
        booking.getId(),
        List.of(PaymentStatus.CREATED, PaymentStatus.PENDING, PaymentStatus.AUTHORIZED)))
        .thenReturn(Optional.of(payment));

    assertThatThrownBy(() -> persistence.prepare(
        "user@example.com", booking.getId(), "different-key"))
        .isInstanceOf(ApiException.class)
        .satisfies(exception -> assertThat(((ApiException) exception).errorCode())
            .isEqualTo("PAYMENT_ATTEMPT_ACTIVE"));
  }

  @Test
  void lostClientIdempotencyCanRecoverActivePendingAttempt() {
    when(bookings.findById(booking.getId())).thenReturn(Optional.of(booking));
    when(payments.findFirstByBookingIdAndStatusInOrderByCreatedAtDesc(
        booking.getId(),
        List.of(
            PaymentStatus.CREATED,
            PaymentStatus.PENDING,
            PaymentStatus.AUTHORIZED,
            PaymentStatus.CAPTURED)))
        .thenReturn(Optional.of(payment));

    PaymentPersistenceService.PreparedPayment recovered = persistence.getActive(
        "user@example.com", booking.getId());

    assertThat(recovered.status()).isEqualTo(PaymentStatus.PENDING);
    assertThat(recovered.providerOrderId()).isEqualTo("order_1");
    assertThat(recovered.bookingId()).isEqualTo(booking.getId());
  }

  @Test
  void wrongProviderOrderCannotCapture() {
    assertMismatch(new PaymentGateway.GatewayPayment(
        "pay_1", "order_other", 100000, "INR", "captured"));
  }

  @Test
  void wrongAmountCannotCapture() {
    assertMismatch(new PaymentGateway.GatewayPayment(
        "pay_1", "order_1", 75000, "INR", "captured"));
  }

  @Test
  void wrongCurrencyCannotCapture() {
    assertMismatch(new PaymentGateway.GatewayPayment(
        "pay_1", "order_1", 100000, "USD", "captured"));
  }

  @Test
  void wrongPaymentIdCannotCaptureAuthorizedPayment() {
    payment.authorized("pay_original");
    assertMismatch(new PaymentGateway.GatewayPayment(
        "pay_other", "order_1", 100000, "INR", "captured"));
  }

  private void assertMismatch(PaymentGateway.GatewayPayment remote) {
    assertThatThrownBy(() -> persistence.applyVerification(
        "user@example.com", paymentId, "pay_1", remote))
        .isInstanceOf(ApiException.class);
    assertThat(payment.getStatus()).isNotEqualTo(PaymentStatus.CAPTURED);
  }
}
