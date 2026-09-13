package com.southrail.reservation.notification.email;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;
import jakarta.mail.Session;
import jakarta.mail.internet.MimeMessage;
import java.io.ByteArrayOutputStream;
import java.time.Instant;
import java.util.Optional;
import java.util.Properties;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.mail.MailSendException;
import org.springframework.mail.javamail.JavaMailSender;
class EmailOutboxProcessorTest {
 @Test void smtpFailurePersistsRetryWithBackoff() throws Exception {
  EmailOutboxRepository repository=mock(EmailOutboxRepository.class); JavaMailSender sender=mock(JavaMailSender.class);
  MimeMessage mime=new MimeMessage(Session.getInstance(new Properties())); mime.setFrom("from@example.com"); mime.setRecipients(jakarta.mail.Message.RecipientType.TO,"to@example.com"); mime.setSubject("subject"); mime.setText("body"); mime.saveChanges();
  ByteArrayOutputStream bytes=new ByteArrayOutputStream(); mime.writeTo(bytes);
  EmailOutboxMessage queued=new EmailOutboxMessage(); queued.setId(UUID.randomUUID()); queued.setMimeMessage(bytes.toByteArray()); queued.setNextAttemptAt(Instant.now());
  when(repository.lockNext(any())).thenReturn(Optional.of(queued)); doThrow(new MailSendException("offline")).when(sender).send(any(MimeMessage.class));
  new EmailOutboxProcessor(repository,sender).deliverNext();
  assertThat(queued.getStatus()).isEqualTo("PENDING"); assertThat(queued.getAttempts()).isEqualTo(1); assertThat(queued.getNextAttemptAt()).isAfter(Instant.now());
 }
 @Test void successfulDeliveryMarksMessageDelivered() throws Exception {
  EmailOutboxRepository repository=mock(EmailOutboxRepository.class); JavaMailSender sender=mock(JavaMailSender.class);
  MimeMessage mime=new MimeMessage(Session.getInstance(new Properties())); mime.setText("body"); mime.saveChanges(); ByteArrayOutputStream bytes=new ByteArrayOutputStream(); mime.writeTo(bytes);
  EmailOutboxMessage queued=new EmailOutboxMessage(); queued.setMimeMessage(bytes.toByteArray()); when(repository.lockNext(any())).thenReturn(Optional.of(queued));
  new EmailOutboxProcessor(repository,sender).deliverNext();
  assertThat(queued.getStatus()).isEqualTo("DELIVERED"); assertThat(queued.getDeliveredAt()).isNotNull();
 }
}
