package com.southrail.reservation.service.notification;

import java.time.Duration;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Service
class EmailOutboxClaimService {
  private static final Duration LEASE = Duration.ofMinutes(2);
  private final EmailOutboxRepository messages;

  EmailOutboxClaimService(EmailOutboxRepository messages) { this.messages = messages; }

  @Transactional(propagation = Propagation.REQUIRES_NEW)
  public Optional<ClaimedEmail> claim() {
    Instant now = Instant.now();
    return messages.lockNext(now).map(message -> {
      message.setStatus("PROCESSING");
      message.setNextAttemptAt(now.plus(LEASE));
      return new ClaimedEmail(message.getId(), message.getMimeMessage());
    });
  }

  @Transactional(propagation = Propagation.REQUIRES_NEW)
  public void delivered(UUID id) {
    messages.findByIdForUpdate(id).filter(message -> "PROCESSING".equals(message.getStatus()))
        .ifPresent(message -> {
          message.setStatus("DELIVERED");
          message.setDeliveredAt(Instant.now());
          message.setLastError(null);
          message.setMimeMessage(null);
        });
  }

  @Transactional(propagation = Propagation.REQUIRES_NEW)
  public void failed(UUID id, String error) {
    messages.findByIdForUpdate(id).filter(message -> "PROCESSING".equals(message.getStatus()))
        .ifPresent(message -> {
          int attempts = message.getAttempts() + 1;
          message.setAttempts(attempts);
          message.setLastError(error);
          if (attempts >= EmailOutboxProcessor.MAX_ATTEMPTS) {
            message.setStatus("FAILED");
            message.setMimeMessage(null);
          } else {
            message.setStatus("PENDING");
            long seconds = Math.min(300, 1L << Math.min(attempts, 11));
            message.setNextAttemptAt(Instant.now().plusSeconds(seconds));
          }
        });
  }

  record ClaimedEmail(UUID id, byte[] mimeMessage) {}
}
