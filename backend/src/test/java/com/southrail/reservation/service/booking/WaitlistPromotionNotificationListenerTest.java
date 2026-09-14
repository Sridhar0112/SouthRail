package com.southrail.reservation.service.booking;

import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

import com.southrail.reservation.service.notification.NotificationService;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class WaitlistPromotionNotificationListenerTest {
  @Test
  void deliversCommittedPromotionUsingExistingNotificationInfrastructure() {
    NotificationService notifications = mock(NotificationService.class);
    WaitlistPromotionNotificationListener listener =
        new WaitlistPromotionNotificationListener(notifications);
    UUID userId = UUID.randomUUID();

    listener.onPromotion(new WaitlistPromotionEvent(userId, "SR123456789", "WL 1", "A1/15"));

    verify(notifications).notifyWaitlistPromoted(userId, "SR123456789", "WL 1", "A1/15");
  }

  @Test
  void notificationFailureDoesNotEscapeAfterCommitListener() {
    NotificationService notifications = mock(NotificationService.class);
    UUID userId = UUID.randomUUID();
    doThrow(new IllegalStateException("notification unavailable")).when(notifications)
        .notifyWaitlistPromoted(userId, "SR123456789", "WL 1", "A1/15");

    new WaitlistPromotionNotificationListener(notifications)
        .onPromotion(new WaitlistPromotionEvent(userId, "SR123456789", "WL 1", "A1/15"));
  }
}
