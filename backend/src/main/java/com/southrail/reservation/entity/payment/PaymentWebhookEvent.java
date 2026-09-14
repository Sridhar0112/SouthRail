package com.southrail.reservation.entity.payment;

import com.southrail.reservation.entity.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import lombok.Getter;

@Getter
@Entity
@Table(name = "payment_webhook_events")
public class PaymentWebhookEvent extends BaseEntity {
  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  private UUID id;

  @Column(nullable = false, length = 20)
  private String provider;

  @Column(name = "event_id", nullable = false, length = 100)
  private String eventId;

  @Column(name = "event_type", nullable = false, length = 80)
  private String eventType;

  @Column(name = "processing_status", nullable = false, length = 20)
  private String processingStatus;

  private Instant receivedAt;
  private Instant processedAt;

  public static PaymentWebhookEvent received(String id, String type) {
    PaymentWebhookEvent event = new PaymentWebhookEvent();
    event.provider = "RAZORPAY";
    event.eventId = id;
    event.eventType = type;
    event.processingStatus = "RECEIVED";
    event.receivedAt = Instant.now();
    return event;
  }

  public void processed() {
    processingStatus = "PROCESSED";
    processedAt = Instant.now();
  }

  public void ignored() {
    processingStatus = "IGNORED";
    processedAt = Instant.now();
  }
}
