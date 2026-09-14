package com.southrail.reservation.payment.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.southrail.reservation.config.properties.RazorpayProperties;
import com.southrail.reservation.entity.account.RoleName;
import com.southrail.reservation.entity.account.User;
import com.southrail.reservation.entity.booking.Booking;
import com.southrail.reservation.entity.booking.BookingStatus;
import com.southrail.reservation.entity.payment.Payment;
import com.southrail.reservation.entity.payment.PaymentRefund;
import com.southrail.reservation.entity.payment.PaymentStatus;
import com.southrail.reservation.payment.gateway.PaymentGateway;
import com.southrail.reservation.repository.account.UserRepository;
import com.southrail.reservation.repository.booking.BookingRepository;
import com.southrail.reservation.repository.payment.PaymentRefundRepository;
import com.southrail.reservation.repository.payment.PaymentRepository;
import com.southrail.reservation.service.audit.AuditLogService;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class AuthorizedCancellationPaymentTest {
  @Test
  void authorizedCancellationCreatesObligationActivatedByLaterCapture() {
    User user = new User();
    user.setId(UUID.randomUUID());
    user.setEmail("user@example.com");
    user.getRoles().add(RoleName.ROLE_USER);
    Booking booking = new Booking();
    booking.setId(UUID.randomUUID());
    booking.setPnr("1234567890");
    booking.setUser(user);
    booking.setStatus(BookingStatus.CANCELLED);
    booking.setTotalFare(new BigDecimal("1000.00"));
    Payment payment = Payment.create(booking, "payment-key");
    payment.orderCreated("order_1");
    payment.authorized("pay_1");

    PaymentRepository payments = mock(PaymentRepository.class);
    PaymentRefundRepository refunds = mock(PaymentRefundRepository.class);
    AuditLogService audit = mock(AuditLogService.class);
    when(payments.findFinancialPaymentForUpdate(
        booking.getId(), List.of(PaymentStatus.AUTHORIZED, PaymentStatus.CAPTURED)))
        .thenReturn(Optional.of(payment));
    when(refunds.findByIdempotencyKey("cancellation:" + booking.getId()))
        .thenReturn(Optional.empty());
    when(refunds.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
    PaymentService service = new PaymentService(
        payments,
        refunds,
        mock(PaymentGateway.class),
        new RazorpayProperties(false, "", "", "", "https://example.invalid"),
        audit,
        mock(PaymentPersistenceService.class));

    BigDecimal calculatedRefund = new BigDecimal("750.00");
    PaymentRefund obligation = service.createRefundObligation(booking, calculatedRefund);

    assertThat(obligation).isNotNull();
    assertThat(obligation.getAmount()).isEqualByComparingTo(calculatedRefund);
    assertThat(payment.getStatus()).isEqualTo(PaymentStatus.AUTHORIZED);
    verify(refunds).save(obligation);

    UUID paymentId = UUID.randomUUID();
    UserRepository users = mock(UserRepository.class);
    when(users.findByEmailIgnoreCase(user.getEmail())).thenReturn(Optional.of(user));
    when(payments.findByIdForUpdate(paymentId)).thenReturn(Optional.of(payment));
    when(payments.findByProviderPaymentId("pay_1")).thenReturn(Optional.empty());
    when(refunds.findByPaymentId(payment.getId())).thenReturn(Optional.of(obligation));
    PaymentPersistenceService persistence = new PaymentPersistenceService(
        payments, mock(BookingRepository.class), users, audit, refunds);

    persistence.applyVerification(
        user.getEmail(),
        paymentId,
        "pay_1",
        new PaymentGateway.GatewayPayment("pay_1", "order_1", 100000, "INR", "captured"));

    assertThat(payment.getStatus()).isEqualTo(PaymentStatus.REFUND_PENDING);
  }
}
