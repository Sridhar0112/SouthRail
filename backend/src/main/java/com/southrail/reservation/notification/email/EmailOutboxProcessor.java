package com.southrail.reservation.notification.email;

import jakarta.mail.Session;
import jakarta.mail.internet.MimeMessage;
import java.io.ByteArrayInputStream;
import java.time.Duration;
import java.time.Instant;
import java.util.Properties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
class EmailOutboxProcessor {
  private static final Logger log = LoggerFactory.getLogger(EmailOutboxProcessor.class);
  private static final int MAX_ATTEMPTS = 10;
  private final EmailOutboxRepository messages;
  private final JavaMailSender sender;

  EmailOutboxProcessor(EmailOutboxRepository messages, JavaMailSender sender) {
    this.messages = messages;
    this.sender = sender;
  }

  @Scheduled(fixedDelayString = "${southrail.email-outbox.poll-delay:5s}")
  @Transactional
  public void deliverNext() {
    messages.lockNext(Instant.now()).ifPresent(this::deliver);
  }

  private void deliver(EmailOutboxMessage message) {
    try {
      MimeMessage mime = new MimeMessage(Session.getInstance(new Properties()),
          new ByteArrayInputStream(message.getMimeMessage()));
      sender.send(mime);
      message.setStatus("DELIVERED");
      message.setDeliveredAt(Instant.now());
      message.setLastError(null);
      message.setMimeMessage(null);
    } catch (Exception ex) {
      int attempts = message.getAttempts() + 1;
      message.setAttempts(attempts);
      message.setLastError(safeMessage(ex));
      if (attempts >= MAX_ATTEMPTS) {
        message.setStatus("FAILED");
        log.error("email_outbox_exhausted id={} attempts={}", message.getId(), attempts);
      } else {
        long seconds = Math.min(300, 1L << Math.min(attempts, 11));
        message.setNextAttemptAt(Instant.now().plus(Duration.ofSeconds(seconds)));
        log.warn("email_outbox_retry_scheduled id={} attempt={}", message.getId(), attempts);
      }
    }
  }

  private String safeMessage(Exception ex) {
    String value = ex.getClass().getSimpleName() + ": " + ex.getMessage();
    return value.length() <= 500 ? value : value.substring(0, 500);
  }
}
