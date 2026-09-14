package com.southrail.reservation.entity.payment;

import com.southrail.reservation.entity.booking.Booking;
import com.southrail.reservation.entity.common.BaseEntity;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;
import lombok.Getter;

@Getter @Entity @Table(name="payment_refunds")
public class PaymentRefund extends BaseEntity {
  @Id @GeneratedValue(strategy=GenerationType.UUID) private UUID id;
  @ManyToOne(fetch=FetchType.LAZY, optional=false) @JoinColumn(name="payment_id") private Payment payment;
  @ManyToOne(fetch=FetchType.LAZY, optional=false) @JoinColumn(name="booking_id") private Booking booking;
  @Column(name="provider_refund_id", length=64) private String providerRefundId;
  @Column(nullable=false, precision=12, scale=2) private BigDecimal amount;
  @Enumerated(EnumType.STRING) @Column(nullable=false, length=20) private RefundStatus status;
  @Column(name="idempotency_key", nullable=false, length=128) private String idempotencyKey;
  @Column(length=250) private String reason;
  private Instant completedAt; private Instant failedAt;
  public static PaymentRefund request(Payment p, BigDecimal amount, String key, String reason) {
    PaymentRefund r=new PaymentRefund(); r.payment=p; r.booking=p.getBooking(); r.amount=amount;
    r.idempotencyKey=key; r.reason=reason; r.status=RefundStatus.REQUESTED; return r;
  }
  public void processing(String providerId) { transition(RefundStatus.PROCESSING); providerRefundId=providerId; }
  public void processed(String providerId) { if (status==RefundStatus.REQUESTED || status==RefundStatus.FAILED) transition(RefundStatus.PROCESSING); providerRefundId=providerId; transition(RefundStatus.PROCESSED); completedAt=Instant.now(); }
  public void failed() { transition(RefundStatus.FAILED); failedAt=Instant.now(); }
  private void transition(RefundStatus next) { if(!status.canTransitionTo(next)) throw new IllegalStateException("Invalid refund transition"); status=next; }
}
