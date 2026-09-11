package com.southrail.reservation.notification.email;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.doThrow;
import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;

import com.southrail.reservation.account.User;
import com.southrail.reservation.shared.config.properties.SouthRailApplicationProperties;
import com.southrail.reservation.shared.config.properties.SouthRailFeatureProperties;
import com.southrail.reservation.shared.config.properties.SouthRailMailProperties;
import jakarta.mail.internet.MimeMessage;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

class EmailNotificationServiceTest {

  @AfterEach
  void cleanTransactionState() {
    if (TransactionSynchronizationManager.isSynchronizationActive()) {
      TransactionSynchronizationManager.clearSynchronization();
    }
    TransactionSynchronizationManager.setActualTransactionActive(false);
  }

  @Test
  void disabledEmailPerformsNoMailOperation() {
    JavaMailSender sender = mock(JavaMailSender.class);
    EmailNotificationService service = service(sender, false);

    service.sendPasswordReset(user(), "raw-token");

    verify(sender, never()).createMimeMessage();
  }

  @Test
  void activeTransactionDefersEmailUntilCommit() {
    JavaMailSender sender = mock(JavaMailSender.class);
    MimeMessage message = mock(MimeMessage.class);
    when(sender.createMimeMessage()).thenReturn(message);
    EmailNotificationService service = service(sender, true);
    TransactionSynchronizationManager.initSynchronization();
    TransactionSynchronizationManager.setActualTransactionActive(true);

    service.sendPasswordReset(user(), "raw-token");
    verify(sender, never()).createMimeMessage();

    TransactionSynchronizationManager.getSynchronizations()
        .forEach(TransactionSynchronization::afterCommit);
    verify(sender).createMimeMessage();
    verify(sender).send(message);
  }

  @Test
  void rolledBackTransactionDoesNotSendEmail() {
    JavaMailSender sender = mock(JavaMailSender.class);
    EmailNotificationService service = service(sender, true);
    TransactionSynchronizationManager.initSynchronization();
    TransactionSynchronizationManager.setActualTransactionActive(true);

    service.sendEmailVerification(user(), "raw-token");
    TransactionSynchronizationManager.getSynchronizations()
        .forEach(sync -> sync.afterCompletion(TransactionSynchronization.STATUS_ROLLED_BACK));

    verify(sender, never()).createMimeMessage();
  }

  @Test
  void failureAfterCommitIsContained() {
    JavaMailSender sender = mock(JavaMailSender.class);
    MimeMessage message = mock(MimeMessage.class);
    when(sender.createMimeMessage()).thenReturn(message);
    doThrow(new IllegalStateException("smtp unavailable")).when(sender).send(message);
    EmailNotificationService service = service(sender, true);
    TransactionSynchronizationManager.initSynchronization();
    TransactionSynchronizationManager.setActualTransactionActive(true);
    service.sendPasswordReset(user(), "raw-token");

    assertDoesNotThrow(() -> TransactionSynchronizationManager.getSynchronizations()
        .forEach(TransactionSynchronization::afterCommit));
  }

  private EmailNotificationService service(JavaMailSender sender, boolean enabled) {
    SouthRailMailProperties mail = new SouthRailMailProperties();
    mail.setFrom("test@southrail.invalid");
    SouthRailApplicationProperties application = new SouthRailApplicationProperties();
    application.setFrontendUrl("https://southrail.invalid");
    SouthRailFeatureProperties features = new SouthRailFeatureProperties();
    features.setEmailEnabled(enabled);
    return new EmailNotificationService(sender, mail, application, features);
  }

  private User user() {
    User user = new User();
    user.setEmail("passenger@southrail.invalid");
    return user;
  }
}
