package com.southrail.reservation.notification.email;

import jakarta.mail.Session;
import jakarta.mail.internet.MimeMessage;
import java.io.ByteArrayInputStream;
import java.util.Properties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
class EmailOutboxProcessor {
  private static final Logger log = LoggerFactory.getLogger(EmailOutboxProcessor.class);
  static final int MAX_ATTEMPTS = 10;
  private final EmailOutboxClaimService claims;
  private final JavaMailSender sender;

  EmailOutboxProcessor(EmailOutboxClaimService claims, JavaMailSender sender) {
    this.claims = claims;
    this.sender = sender;
  }

  @Scheduled(fixedDelayString = "${southrail.email-outbox.poll-delay:5s}")
  public void deliverNext() {
    claims.claim().ifPresent(this::deliver);
  }

  private void deliver(EmailOutboxClaimService.ClaimedEmail claimed) {
    try {
      MimeMessage mime = new MimeMessage(Session.getInstance(new Properties()),
          new ByteArrayInputStream(claimed.mimeMessage()));
      // Deliberately outside a database transaction: SMTP cannot extend a business
      // transaction or hold an inventory/outbox row lock.
      sender.send(mime);
      claims.delivered(claimed.id());
    } catch (Exception ex) {
      String error = safeMessage(ex);
      claims.failed(claimed.id(), error);
      log.warn("email_outbox_delivery_failed id={}", claimed.id());
    }
  }

  private String safeMessage(Exception ex) {
    String value = ex.getClass().getSimpleName() + ": " + ex.getMessage();
    return value.length() <= 500 ? value : value.substring(0, 500);
  }
}
