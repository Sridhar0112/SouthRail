package com.southrail.reservation.service;

import com.southrail.reservation.dto.NotificationDtos;
import com.southrail.reservation.dto.RefundQuoteDto;
import com.southrail.reservation.entity.Booking;
import com.southrail.reservation.entity.Notification;
import com.southrail.reservation.entity.User;
import com.southrail.reservation.exception.ApiException;
import com.southrail.reservation.repository.NotificationRepository;
import com.southrail.reservation.repository.UserRepository;
import java.util.List;
import java.util.stream.Collectors;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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

  public void notifyBookingCancelled(User user, Booking booking, RefundQuoteDto quote) {
    Notification notification = new Notification();
    notification.setUser(user);
    notification.setChannel("IN_APP");
    notification.setTitle("Booking cancelled");
    notification.setMessage("Your booking PNR " + booking.getPnr()
        + " has been cancelled. Refund amount: Rs " + quote.getRefundAmount() + ".");
    notification.setReadFlag(false);
    notifications.save(notification);
  }
}
