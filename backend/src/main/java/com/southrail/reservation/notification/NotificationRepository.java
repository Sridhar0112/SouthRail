package com.southrail.reservation.notification;

import com.southrail.reservation.notification.Notification;
import com.southrail.reservation.account.User;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface NotificationRepository extends JpaRepository<Notification, UUID> {
  List<Notification> findByUserOrderByCreatedAtDesc(User user, Pageable pageable);
}
