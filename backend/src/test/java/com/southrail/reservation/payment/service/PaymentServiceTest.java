package com.southrail.reservation.payment.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.southrail.reservation.config.properties.RazorpayProperties;
import com.southrail.reservation.entity.payment.PaymentStatus;
import com.southrail.reservation.exception.ApiException;
import com.southrail.reservation.payment.dto.PaymentDtos.ActivePaymentResponse;
import com.southrail.reservation.payment.dto.PaymentDtos.CreatePaymentOrderResponse;
import com.southrail.reservation.payment.dto.PaymentDtos.PaymentStatusResponse;
import com.southrail.reservation.payment.dto.PaymentDtos.VerificationRequest;
import com.southrail.reservation.payment.gateway.PaymentGateway;
import com.southrail.reservation.repository.payment.PaymentRefundRepository;
import com.southrail.reservation.repository.payment.PaymentRepository;
import com.southrail.reservation.service.audit.AuditLogService;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.util.HexFormat;
import java.util.Map;
import java.util.UUID;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class PaymentServiceTest {
  private static final String SECRET = "payment-test-secret";

  private PaymentGateway gateway;
  private PaymentPersistenceService persistence;
  private PaymentService service;

  @BeforeEach
  void setUp() {
    gateway = mock(PaymentGateway.class);
    persistence = mock(PaymentPersistenceService.class);
    service = new PaymentService(
        mock(PaymentRepository.class),
        mock(PaymentRefundRepository.class),
        gateway,
        new RazorpayProperties(true, "key", SECRET, "webhook", "https://example.invalid"),
        mock(AuditLogService.class),
        persistence);
  }

  @Test
  void capturedProviderPaymentBecomesCaptured() throws Exception {
    UUID paymentId = UUID.randomUUID();
    verificationContext(paymentId, PaymentStatus.PENDING, null);
    PaymentGateway.GatewayPayment remote = new PaymentGateway.GatewayPayment(
        "pay_1", "order_1", 100000, "INR", "captured");
    when(gateway.fetchPayment("pay_1")).thenReturn(remote);
    PaymentStatusResponse captured = new PaymentStatusResponse(
        paymentId, UUID.randomUUID(), new BigDecimal("1000.00"), "INR",
        PaymentStatus.CAPTURED, "order_1", "pay_1");
    when(persistence.applyVerification("user@example.com", paymentId, "pay_1", remote))
        .thenReturn(captured);

    PaymentStatusResponse result = service.verify(
        "user@example.com", paymentId, request("pay_1"));

    assertThat(result.status()).isEqualTo(PaymentStatus.CAPTURED);
  }

  @Test
  void authorizedProviderPaymentIsNotReportedAsCaptured() throws Exception {
    UUID paymentId = UUID.randomUUID();
    verificationContext(paymentId, PaymentStatus.PENDING, null);
    PaymentGateway.GatewayPayment remote = new PaymentGateway.GatewayPayment(
        "pay_1", "order_1", 100000, "INR", "authorized");
    when(gateway.fetchPayment("pay_1")).thenReturn(remote);
    PaymentStatusResponse authorized = new PaymentStatusResponse(
        paymentId, UUID.randomUUID(), new BigDecimal("1000.00"), "INR",
        PaymentStatus.AUTHORIZED, "order_1", "pay_1");
    when(persistence.applyVerification("user@example.com", paymentId, "pay_1", remote))
        .thenReturn(authorized);

    assertThat(service.verify("user@example.com", paymentId, request("pay_1")).status())
        .isEqualTo(PaymentStatus.AUTHORIZED);
  }

  @Test
  void invalidSignatureDoesNotFetchOrApplyPayment() {
    UUID paymentId = UUID.randomUUID();
    verificationContext(paymentId, PaymentStatus.PENDING, null);
    VerificationRequest request = new VerificationRequest("order_1", "pay_1", "invalid");

    assertThatThrownBy(() -> service.verify("user@example.com", paymentId, request))
        .isInstanceOf(ApiException.class);
    verify(gateway, never()).fetchPayment(any());
    verify(persistence, never()).applyVerification(any(), any(), any(), any());
  }

  @Test
  void differentPaymentIdReturnedByProviderIsRejected() throws Exception {
    UUID paymentId = UUID.randomUUID();
    verificationContext(paymentId, PaymentStatus.PENDING, null);
    when(gateway.fetchPayment("pay_1")).thenReturn(new PaymentGateway.GatewayPayment(
        "pay_other", "order_1", 100000, "INR", "captured"));

    assertThatThrownBy(() -> service.verify("user@example.com", paymentId, request("pay_1")))
        .isInstanceOf(ApiException.class);
    verify(persistence, never()).applyVerification(any(), any(), any(), any());
  }

  @Test
  void createsServerAuthoritativeOrderAndPersistsProviderOrder() {
    UUID paymentId = UUID.randomUUID();
    UUID bookingId = UUID.randomUUID();
    PaymentPersistenceService.PreparedPayment created = prepared(
        paymentId, bookingId, PaymentStatus.CREATED, null, true);
    PaymentPersistenceService.PreparedPayment completed = prepared(
        paymentId, bookingId, PaymentStatus.PENDING, "order_1", false);
    when(persistence.prepare(
        org.mockito.ArgumentMatchers.eq("user@example.com"),
        org.mockito.ArgumentMatchers.eq(bookingId),
        org.mockito.ArgumentMatchers.anyString())).thenReturn(created);
    when(gateway.createOrder(100000, "INR", paymentId.toString(),
        Map.of("booking_id", bookingId.toString(), "pnr", "1234567890")))
        .thenReturn(new PaymentGateway.GatewayOrder("order_1", 100000, "INR", "created"));
    when(persistence.completeOrder(paymentId, "order_1")).thenReturn(completed);

    CreatePaymentOrderResponse result = service.createOrder(
        "user@example.com", bookingId, "client-key");

    assertThat(result.razorpayOrderId()).isEqualTo("order_1");
    assertThat(result.amount()).isEqualTo(100000);
    assertThat(result.currency()).isEqualTo("INR");
  }

  @Test
  void duplicateIdempotentOrderReturnsExistingOrderWithoutProviderCall() {
    UUID paymentId = UUID.randomUUID();
    UUID bookingId = UUID.randomUUID();
    when(persistence.prepare(
        org.mockito.ArgumentMatchers.eq("user@example.com"),
        org.mockito.ArgumentMatchers.eq(bookingId),
        org.mockito.ArgumentMatchers.anyString())).thenReturn(
            prepared(paymentId, bookingId, PaymentStatus.PENDING, "order_1", false));

    CreatePaymentOrderResponse first = service.createOrder(
        "user@example.com", bookingId, "same-key");
    CreatePaymentOrderResponse second = service.createOrder(
        "user@example.com", bookingId, "same-key");

    assertThat(first.paymentId()).isEqualTo(second.paymentId());
    verify(gateway, never()).createOrder(
        org.mockito.ArgumentMatchers.anyLong(),
        org.mockito.ArgumentMatchers.anyString(),
        org.mockito.ArgumentMatchers.anyString(),
        org.mockito.ArgumentMatchers.anyMap());
    verify(persistence, times(2)).prepare(
        org.mockito.ArgumentMatchers.eq("user@example.com"),
        org.mockito.ArgumentMatchers.eq(bookingId),
        org.mockito.ArgumentMatchers.anyString());
  }

  @Test
  void recoversAuthorizedAttemptWithoutCreatingAnotherOrder() {
    UUID paymentId = UUID.randomUUID();
    UUID bookingId = UUID.randomUUID();
    when(persistence.getActive("user@example.com", bookingId)).thenReturn(
        prepared(paymentId, bookingId, PaymentStatus.AUTHORIZED, "order_1", false));

    ActivePaymentResponse result = service.getActive("user@example.com", bookingId);

    assertThat(result.paymentId()).isEqualTo(paymentId);
    assertThat(result.razorpayOrderId()).isEqualTo("order_1");
    assertThat(result.status()).isEqualTo(PaymentStatus.AUTHORIZED);
    verify(gateway, never()).createOrder(
        org.mockito.ArgumentMatchers.anyLong(),
        org.mockito.ArgumentMatchers.anyString(),
        org.mockito.ArgumentMatchers.anyString(),
        org.mockito.ArgumentMatchers.anyMap());
  }

  private void verificationContext(
      UUID paymentId, PaymentStatus status, String providerPaymentId) {
    when(persistence.verificationContext("user@example.com", paymentId)).thenReturn(
        new PaymentPersistenceService.VerificationContext(
            paymentId,
            "order_1",
            providerPaymentId,
            new BigDecimal("1000.00"),
            "INR",
            status));
  }

  private VerificationRequest request(String paymentId) throws Exception {
    String value = "order_1|" + paymentId;
    Mac mac = Mac.getInstance("HmacSHA256");
    mac.init(new SecretKeySpec(SECRET.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
    String signature = HexFormat.of().formatHex(
        mac.doFinal(value.getBytes(StandardCharsets.UTF_8)));
    return new VerificationRequest("order_1", paymentId, signature);
  }

  private PaymentPersistenceService.PreparedPayment prepared(
      UUID paymentId,
      UUID bookingId,
      PaymentStatus status,
      String providerOrderId,
      boolean created) {
    return new PaymentPersistenceService.PreparedPayment(
        paymentId,
        bookingId,
        "1234567890",
        new BigDecimal("1000.00"),
        "INR",
        status,
        providerOrderId,
        "stored-key",
        created);
  }
}
