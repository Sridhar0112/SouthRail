package com.southrail.reservation.notification.email;

import static org.mockito.Mockito.*;
import jakarta.mail.Session;
import jakarta.mail.internet.MimeMessage;
import java.io.ByteArrayOutputStream;
import java.util.Optional;
import java.util.Properties;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.mail.MailSendException;
import org.springframework.mail.javamail.JavaMailSender;

class EmailOutboxProcessorTest {
  @Test void smtpFailureIsRecordedForRetryAfterTheClaimTransaction() throws Exception {
    EmailOutboxClaimService claims = mock(EmailOutboxClaimService.class);
    JavaMailSender sender = mock(JavaMailSender.class);
    UUID id = UUID.randomUUID();
    when(claims.claim()).thenReturn(Optional.of(new EmailOutboxClaimService.ClaimedEmail(id, messageBytes())));
    doThrow(new MailSendException("offline")).when(sender).send(any(MimeMessage.class));

    new EmailOutboxProcessor(claims, sender).deliverNext();

    verify(claims).failed(eq(id), contains("MailSendException"));
    verify(claims, never()).delivered(any());
  }

  @Test void successfulSmtpDeliveryCompletesClaim() throws Exception {
    EmailOutboxClaimService claims = mock(EmailOutboxClaimService.class);
    JavaMailSender sender = mock(JavaMailSender.class);
    UUID id = UUID.randomUUID();
    when(claims.claim()).thenReturn(Optional.of(new EmailOutboxClaimService.ClaimedEmail(id, messageBytes())));

    new EmailOutboxProcessor(claims, sender).deliverNext();

    verify(sender).send(any(MimeMessage.class));
    verify(claims).delivered(id);
  }

  private byte[] messageBytes() throws Exception {
    MimeMessage mime = new MimeMessage(Session.getInstance(new Properties()));
    mime.setFrom("from@example.com");
    mime.setRecipients(jakarta.mail.Message.RecipientType.TO, "to@example.com");
    mime.setSubject("subject"); mime.setText("body"); mime.saveChanges();
    ByteArrayOutputStream bytes = new ByteArrayOutputStream(); mime.writeTo(bytes); return bytes.toByteArray();
  }
}
