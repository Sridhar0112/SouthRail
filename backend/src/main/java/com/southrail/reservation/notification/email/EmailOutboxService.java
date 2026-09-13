package com.southrail.reservation.notification.email;

import jakarta.mail.internet.MimeMessage;
import java.io.ByteArrayOutputStream;
import java.time.Instant;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
class EmailOutboxService {
  private final EmailOutboxRepository messages;

  EmailOutboxService(EmailOutboxRepository messages) { this.messages = messages; }

  @Transactional
  public void enqueue(MimeMessage message) {
    try {
      ByteArrayOutputStream bytes = new ByteArrayOutputStream();
      message.writeTo(bytes);
      EmailOutboxMessage queued = new EmailOutboxMessage();
      queued.setMimeMessage(bytes.toByteArray());
      queued.setNextAttemptAt(Instant.now());
      messages.save(queued);
    } catch (Exception ex) {
      throw new IllegalStateException("Unable to persist email in outbox", ex);
    }
  }
}
