package com.southrail.reservation.payment.controller;

import com.southrail.reservation.payment.dto.PaymentDtos.CreatePaymentOrderResponse;
import com.southrail.reservation.payment.dto.PaymentDtos.PaymentBookingDetails;
import com.southrail.reservation.payment.dto.PaymentDtos.PaymentStatusResponse;
import com.southrail.reservation.payment.dto.PaymentDtos.VerificationRequest;
import com.southrail.reservation.payment.service.PaymentBookingDetailsService;
import com.southrail.reservation.payment.service.PaymentService;
import com.southrail.reservation.payment.service.PaymentWebhookService;
import jakarta.validation.Valid;
import java.security.Principal;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/payments")
public class PaymentController {
  private final PaymentService payments;
  private final PaymentWebhookService webhooks;
  private final PaymentBookingDetailsService bookingDetails;

  public PaymentController(
      PaymentService payments,
      PaymentWebhookService webhooks,
      PaymentBookingDetailsService bookingDetails) {
    this.payments = payments;
    this.webhooks = webhooks;
    this.bookingDetails = bookingDetails;
  }

  @GetMapping("/bookings/{bookingId}/details")
  PaymentBookingDetails bookingDetails(Principal principal, @PathVariable UUID bookingId) {
    return bookingDetails.get(principal.getName(), bookingId);
  }

  @PostMapping("/bookings/{bookingId}/orders")
  ResponseEntity<CreatePaymentOrderResponse> create(
      Principal principal,
      @PathVariable UUID bookingId,
      @RequestHeader("Idempotency-Key") String key) {
    return ResponseEntity.status(HttpStatus.CREATED)
        .body(payments.createOrder(principal.getName(), bookingId, key));
  }

  @PostMapping("/{paymentId}/verify")
  PaymentStatusResponse verify(
      Principal principal,
      @PathVariable UUID paymentId,
      @Valid @RequestBody VerificationRequest request) {
    return payments.verify(principal.getName(), paymentId, request);
  }

  @GetMapping("/{paymentId}")
  PaymentStatusResponse status(Principal principal, @PathVariable UUID paymentId) {
    return payments.get(principal.getName(), paymentId);
  }

  @PostMapping("/webhooks/razorpay")
  ResponseEntity<Void> webhook(
      @RequestBody byte[] raw,
      @RequestHeader("X-Razorpay-Signature") String signature,
      @RequestHeader(value = "X-Razorpay-Event-Id", required = false) String eventId) {
    webhooks.receive(raw, signature, eventId);
    return ResponseEntity.ok().build();
  }
}
