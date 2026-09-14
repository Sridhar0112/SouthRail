package com.southrail.reservation.service.notification;

import com.southrail.reservation.dto.notification.NotificationDtos;
import com.southrail.reservation.entity.notification.Notification;
import com.southrail.reservation.entity.account.User;
import com.southrail.reservation.exception.ApiException;
import com.southrail.reservation.repository.notification.NotificationRepository;
import com.southrail.reservation.repository.account.UserRepository;
import java.util.List;
import java.math.BigDecimal;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.annotation.Propagation;

@Service
public class NotificationService {
  private final NotificationRepository notifications;
  private final UserRepository users;

  public NotificationService(NotificationRepository notifications, UserRepository users) {
    this.notifications = notifications;
    this.users = users;
  }

  @Transactional(readOnly = true)
  public List<NotificationDtos.NotificationView> list(String email, Pageable pageable) {
    User user = users.findByEmailIgnoreCase(email)
        .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "User not found"));
    return notifications.findByUserOrderByCreatedAtDesc(user, pageable).stream()
        .map(item -> new NotificationDtos.NotificationView(
            item.getId().toString(),
            item.getChannel(),
            item.getTitle(),
            item.getMessage(),
            item.isReadFlag(),
            item.getCreatedAt()))
        .collect(Collectors.toList());
  }

  public void notifyBookingCancelled(UUID userId, String pnr, BigDecimal refundAmount) {
    User user = users.findById(userId)
        .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Booking owner not found"));
    Notification notification = new Notification();
    notification.setUser(user);
    notification.setChannel("IN_APP");
    notification.setTitle("Booking cancelled");
    notification.setMessage("Your booking PNR " + pnr
        + " has been cancelled. Refund amount: Rs " + refundAmount + ".");
    notification.setReadFlag(false);
    notifications.save(notification);
  }

  @Transactional(propagation = Propagation.REQUIRES_NEW)
  public void notifyWaitlistPromoted(UUID userId, String pnr, String previousStatus, String seat) {
    User user = users.findById(userId)
        .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Booking owner not found"));
    Notification notification = new Notification();
    notification.setUser(user);
    notification.setChannel("IN_APP");
    notification.setTitle("Waitlist booking confirmed");
    notification.setMessage("Your SouthRail booking has been confirmed. PNR: " + pnr
        + ". Previous status: " + previousStatus + ". Seat: " + seat + ".");
    notification.setReadFlag(false);
    notifications.save(notification);
  }
}
