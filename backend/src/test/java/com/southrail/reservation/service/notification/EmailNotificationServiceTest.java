package com.southrail.reservation.service.notification;

import static org.mockito.Mockito.*;
import com.southrail.reservation.entity.account.User;
import com.southrail.reservation.config.properties.*;
import jakarta.mail.internet.MimeMessage;
import org.junit.jupiter.api.Test;
import org.springframework.mail.javamail.JavaMailSender;

class EmailNotificationServiceTest {
  @Test void disabledEmailCreatesNoMessage() {
    JavaMailSender sender = mock(JavaMailSender.class);
    service(sender, mock(EmailOutboxService.class), false).sendPasswordReset(user(), "token");
    verifyNoInteractions(sender);
  }

  @Test void enabledEmailIsPersistedToTransactionalOutboxInsteadOfSentDirectly() {
    JavaMailSender sender = mock(JavaMailSender.class);
    EmailOutboxService outbox = mock(EmailOutboxService.class);
    MimeMessage message = mock(MimeMessage.class);
    when(sender.createMimeMessage()).thenReturn(message);
    service(sender, outbox, true).sendPasswordReset(user(), "token");
    verify(outbox).enqueue(message);
    verify(sender, never()).send(any(MimeMessage.class));
  }

  private EmailNotificationService service(JavaMailSender sender, EmailOutboxService outbox, boolean enabled) {
    SouthRailMailProperties mail = new SouthRailMailProperties();
    mail.setFrom("test@southrail.invalid");
    SouthRailApplicationProperties app = new SouthRailApplicationProperties();
    app.setFrontendUrl("https://southrail.invalid");
    SouthRailFeatureProperties features = new SouthRailFeatureProperties();
    features.setEmailEnabled(enabled);
    return new EmailNotificationService(sender, mail, app, features, outbox);
  }
  private User user() { User user = new User(); user.setEmail("passenger@southrail.invalid"); return user; }
}
