package com.southrail.reservation.entity.payment;

import com.southrail.reservation.entity.booking.Booking;
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
@Table(name = "payment_refunds")
public class PaymentRefund extends BaseEntity {
  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  private UUID id;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "payment_id")
  private Payment payment;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "booking_id")
  private Booking booking;

  @Column(name = "provider_refund_id", length = 64)
  private String providerRefundId;

  @Column(nullable = false, precision = 12, scale = 2)
  private BigDecimal amount;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 20)
  private RefundStatus status;

  @Column(name = "idempotency_key", nullable = false, length = 128)
  private String idempotencyKey;

  @Column(length = 250)
  private String reason;

  private Instant completedAt;
  private Instant failedAt;

  public static PaymentRefund request(Payment payment, BigDecimal amount, String key, String reason) {
    PaymentRefund refund = new PaymentRefund();
    refund.payment = payment;
    refund.booking = payment.getBooking();
    refund.amount = amount;
    refund.idempotencyKey = key;
    refund.reason = reason;
    refund.status = RefundStatus.REQUESTED;
    return refund;
  }

  public void processing() { transition(RefundStatus.PROCESSING); }

  public void providerAccepted(String providerId) {
    providerRefundId = providerId;
    transition(RefundStatus.PROCESSING);
  }

  public void processed(String providerId) {
    if (status == RefundStatus.REQUESTED || status == RefundStatus.FAILED) {
      transition(RefundStatus.PROCESSING);
    }
    providerRefundId = providerId;
    transition(RefundStatus.PROCESSED);
    completedAt = Instant.now();
  }

  public void failed() {
    transition(RefundStatus.FAILED);
    failedAt = Instant.now();
  }

  private void transition(RefundStatus next) {
    if (!status.canTransitionTo(next)) {
      throw new IllegalStateException("Invalid refund transition " + status + " -> " + next);
    }
    status = next;
  }
}
