package com.southrail.reservation.payment.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.southrail.reservation.config.properties.RazorpayProperties;
import com.southrail.reservation.entity.booking.Booking;
import com.southrail.reservation.entity.payment.Payment;
import com.southrail.reservation.entity.payment.PaymentStatus;
import com.southrail.reservation.exception.ApiException;
import com.southrail.reservation.repository.payment.PaymentRefundRepository;
import com.southrail.reservation.repository.payment.PaymentRepository;
import com.southrail.reservation.repository.payment.PaymentWebhookEventRepository;
import com.southrail.reservation.service.audit.AuditLogService;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.HexFormat;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.function.Consumer;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.transaction.TransactionStatus;
import org.springframework.transaction.support.TransactionTemplate;

class PaymentWebhookServiceTest {
  private static final String SECRET = "webhook-test-secret";

  private PaymentWebhookEventRepository events;
  private PaymentRepository payments;
  private PaymentWebhookService service;

  @BeforeEach
  void setUp() {
    events = mock(PaymentWebhookEventRepository.class);
    payments = mock(PaymentRepository.class);
    when(events.saveAndFlush(any())).thenAnswer(invocation -> invocation.getArgument(0));
    TransactionTemplate transactions = mock(TransactionTemplate.class);
    org.mockito.Mockito.doAnswer(invocation -> {
      @SuppressWarnings("unchecked")
      Consumer<TransactionStatus> callback = invocation.getArgument(0);
      callback.accept(mock(TransactionStatus.class));
      return null;
    }).when(transactions).executeWithoutResult(any());
    service = new PaymentWebhookService(
        new RazorpayProperties(true, "key", "secret", SECRET, "https://example.invalid"),
        new ObjectMapper(),
        events,
        payments,
        mock(PaymentRefundRepository.class),
        mock(AuditLogService.class),
        transactions);
  }

  @Test
  void capturedWebhookValidatesAmountAndCurrency() throws Exception {
    Payment payment = pendingPayment(new BigDecimal("1000.00"), "order_1");
    when(payments.findByProviderOrderIdForUpdate("order_1")).thenReturn(Optional.of(payment));
    String body = paymentEvent("payment.captured", 100000, "INR");

    service.receive(bytes(body), signature(body), "event-1");

    assertThat(payment.getStatus()).isEqualTo(PaymentStatus.CAPTURED);
    assertThat(payment.getProviderPaymentId()).isEqualTo("pay_1");
  }

  @Test
  void mismatchedWebhookAmountCannotCapturePayment() throws Exception {
    Payment payment = pendingPayment(new BigDecimal("1000.00"), "order_1");
    when(payments.findByProviderOrderIdForUpdate("order_1")).thenReturn(Optional.of(payment));
    String body = paymentEvent("payment.captured", 75000, "INR");

    assertThatThrownBy(() -> service.receive(bytes(body), signature(body), "event-2"))
        .isInstanceOf(ApiException.class)
        .satisfies(exception -> assertThat(((ApiException) exception).errorCode())
            .isEqualTo("PAYMENT_AMOUNT_MISMATCH"));
    assertThat(payment.getStatus()).isEqualTo(PaymentStatus.PENDING);
  }

  @Test
  void concurrentDuplicateConstraintRaceIsAcceptedAsIdempotent() throws Exception {
    when(events.saveAndFlush(any())).thenThrow(new DataIntegrityViolationException(
        "duplicate key violates unique constraint \"uq_webhook_provider_event\""));
    String body = "{\"event\":\"unknown.event\",\"payload\":{}}";
    String signature = signature(body);
    int deliveries = 5;
    CountDownLatch start = new CountDownLatch(1);
    try (var executor = Executors.newFixedThreadPool(deliveries)) {
      List<Future<Void>> futures = new ArrayList<>();
      for (int index = 0; index < deliveries; index++) {
        futures.add(executor.submit(() -> {
          start.await();
          service.receive(bytes(body), signature, "same-event");
          return null;
        }));
      }
      start.countDown();
      for (Future<Void> future : futures) {
        future.get(5, TimeUnit.SECONDS);
      }
      executor.shutdown();
      assertThat(executor.awaitTermination(5, TimeUnit.SECONDS)).isTrue();
    }

    verify(events, org.mockito.Mockito.times(deliveries)).saveAndFlush(any());
  }

  @Test
  void invalidSignatureDoesNotPersistEvent() {
    String body = "{\"event\":\"payment.captured\",\"payload\":{}}";

    assertThatThrownBy(() -> service.receive(bytes(body), "invalid", "event-3"))
        .isInstanceOf(ApiException.class);
    verify(events, org.mockito.Mockito.never()).saveAndFlush(any());
  }

  private Payment pendingPayment(BigDecimal amount, String orderId) {
    Booking booking = new Booking();
    booking.setTotalFare(amount);
    Payment payment = Payment.create(booking, "key");
    payment.orderCreated(orderId);
    return payment;
  }

  private String paymentEvent(String type, long amount, String currency) {
    return "{\"event\":\"" + type + "\",\"payload\":{\"payment\":{\"entity\":{"
        + "\"id\":\"pay_1\",\"order_id\":\"order_1\",\"amount\":" + amount
        + ",\"currency\":\"" + currency + "\"}}}}";
  }

  private byte[] bytes(String value) {
    return value.getBytes(StandardCharsets.UTF_8);
  }

  private String signature(String body) throws Exception {
    Mac mac = Mac.getInstance("HmacSHA256");
    mac.init(new SecretKeySpec(SECRET.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
    return HexFormat.of().formatHex(mac.doFinal(bytes(body)));
  }
}
