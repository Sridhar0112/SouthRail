package com.southrail.reservation.payment.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.southrail.reservation.entity.account.RoleName;
import com.southrail.reservation.entity.account.User;
import com.southrail.reservation.entity.booking.Booking;
import com.southrail.reservation.entity.payment.Payment;
import com.southrail.reservation.entity.payment.PaymentStatus;
import com.southrail.reservation.exception.ApiException;
import com.southrail.reservation.payment.gateway.PaymentGateway;
import com.southrail.reservation.repository.account.UserRepository;
import com.southrail.reservation.repository.booking.BookingRepository;
import com.southrail.reservation.repository.payment.PaymentRepository;
import com.southrail.reservation.service.audit.AuditLogService;
import java.math.BigDecimal;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class PaymentPersistenceServiceTest {
  private final UUID paymentId = UUID.randomUUID();
  private Payment payment;
  private PaymentPersistenceService persistence;

  @BeforeEach
  void setUp() {
    User user = new User();
    user.setId(UUID.randomUUID());
    user.setEmail("user@example.com");
    user.getRoles().add(RoleName.ROLE_USER);
    Booking booking = new Booking();
    booking.setId(UUID.randomUUID());
    booking.setPnr("1234567890");
    booking.setUser(user);
    booking.setTotalFare(new BigDecimal("1000.00"));
    payment = Payment.create(booking, "key");
    payment.orderCreated("order_1");

    PaymentRepository payments = mock(PaymentRepository.class);
    UserRepository users = mock(UserRepository.class);
    when(payments.findByIdForUpdate(paymentId)).thenReturn(Optional.of(payment));
    when(payments.findByProviderPaymentId("pay_1")).thenReturn(Optional.empty());
    when(users.findByEmailIgnoreCase("user@example.com")).thenReturn(Optional.of(user));
    persistence = new PaymentPersistenceService(
        payments,
        mock(BookingRepository.class),
        users,
        mock(AuditLogService.class));
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
