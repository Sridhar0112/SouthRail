package com.southrail.reservation.entity.payment;
import com.southrail.reservation.entity.common.BaseEntity;
import jakarta.persistence.*; import java.time.Instant; import java.util.UUID; import lombok.Getter;
@Getter @Entity @Table(name="payment_webhook_events")
public class PaymentWebhookEvent extends BaseEntity {
 @Id @GeneratedValue(strategy=GenerationType.UUID) private UUID id;
 @Column(nullable=false,length=20) private String provider;
 @Column(name="event_id",nullable=false,length=100) private String eventId;
 @Column(name="event_type",nullable=false,length=80) private String eventType;
 @Column(name="processing_status",nullable=false,length=20) private String processingStatus;
 private Instant receivedAt; private Instant processedAt;
 public static PaymentWebhookEvent received(String id,String type){var e=new PaymentWebhookEvent();e.provider="RAZORPAY";e.eventId=id;e.eventType=type;e.processingStatus="RECEIVED";e.receivedAt=Instant.now();return e;}
 public void processed(){processingStatus="PROCESSED";processedAt=Instant.now();}
 public void ignored(){processingStatus="IGNORED";processedAt=Instant.now();}
}
