package com.southrail.reservation.notification.email;

import com.southrail.reservation.shared.persistence.BaseEntity;
import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "email_outbox")
class EmailOutboxMessage extends BaseEntity {
  @Id @GeneratedValue(strategy = GenerationType.UUID)
  private UUID id;
  @Column(name = "mime_message")
  private byte[] mimeMessage;
  @Column(nullable = false, length = 20)
  private String status = "PENDING";
  @Column(nullable = false)
  private int attempts;
  @Column(name = "next_attempt_at", nullable = false)
  private Instant nextAttemptAt = Instant.now();
  @Column(name = "delivered_at")
  private Instant deliveredAt;
  @Column(name = "last_error", length = 500)
  private String lastError;
}
