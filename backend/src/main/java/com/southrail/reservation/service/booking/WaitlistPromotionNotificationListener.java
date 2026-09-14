package com.southrail.reservation.service.booking;

import com.southrail.reservation.service.notification.NotificationService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Component
public class WaitlistPromotionNotificationListener {
  private static final Logger log = LoggerFactory.getLogger(WaitlistPromotionNotificationListener.class);
  private final NotificationService notifications;

  public WaitlistPromotionNotificationListener(NotificationService notifications) {
    this.notifications = notifications;
  }

  @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
  public void onPromotion(WaitlistPromotionEvent event) {
    try {
      notifications.notifyWaitlistPromoted(
          event.userId(), event.pnr(), event.previousStatus(), event.seatNumber());
    } catch (RuntimeException ex) {
      // Promotion is already committed. Notification failure must never undo it.
      log.error("waitlist_promotion_notification_failed pnr={}", event.pnr(), ex);
    }
  }
}
