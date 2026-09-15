package com.southrail.reservation.entity.payment;

import com.southrail.reservation.entity.booking.Booking;
import com.southrail.reservation.entity.booking.ReservationHold;
import com.southrail.reservation.entity.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;
import lombok.Getter;

@Getter
@Entity
@Table(name = "payments")
public class Payment extends BaseEntity {
  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  private UUID id;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "booking_id")
  private Booking booking;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "reservation_hold_id")
  private ReservationHold reservationHold;

  @Column(nullable = false, length = 20)
  private String provider;

  @Column(name = "provider_order_id", length = 64)
  private String providerOrderId;

  @Column(name = "provider_payment_id", length = 64)
  private String providerPaymentId;

  @Column(nullable = false, precision = 12, scale = 2)
  private BigDecimal amount;

  @Column(nullable = false, length = 3)
  private String currency;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 24)
  private PaymentStatus status;

  @Column(name = "idempotency_key", nullable = false, length = 128)
  private String idempotencyKey;

  @Column(name = "failure_code", length = 80)
  private String failureCode;

  @Column(name = "failure_description", length = 500)
  private String failureDescription;

  private Instant authorizedAt;
  private Instant capturedAt;
  private Instant failedAt;

  public static Payment create(Booking booking, String key) {
    Payment payment = new Payment();
    payment.booking = booking;
    payment.provider = "RAZORPAY";
    payment.amount = booking.getTotalFare();
    payment.currency = "INR";
    payment.status = PaymentStatus.CREATED;
    payment.idempotencyKey = key;
    return payment;
  }

  public static Payment create(ReservationHold hold, String key) {
    Payment payment = new Payment();
    payment.reservationHold = hold;
    payment.provider = "RAZORPAY";
    payment.amount = hold.getTotalFare();
    payment.currency = "INR";
    payment.status = PaymentStatus.CREATED;
    payment.idempotencyKey = key;
    return payment;
  }

  public void attachBooking(Booking booking) { this.booking = booking; }

  public void orderCreated(String orderId) {
    providerOrderId = orderId;
    transition(PaymentStatus.PENDING);
  }

  public void authorized(String paymentId) {
    providerPaymentId = paymentId;
    authorizedAt = Instant.now();
    transition(PaymentStatus.AUTHORIZED);
  }

  public void captured(String paymentId) {
    providerPaymentId = paymentId;
    capturedAt = Instant.now();
    transition(PaymentStatus.CAPTURED);
  }

  public void failed(String code, String description) {
    failureCode = code;
    failureDescription = description;
    failedAt = Instant.now();
    transition(PaymentStatus.FAILED);
  }

  public void transition(PaymentStatus next) {
    if (!status.canTransitionTo(next)) {
      throw new IllegalStateException("Invalid payment transition " + status + " -> " + next);
    }
    status = next;
  }
}
