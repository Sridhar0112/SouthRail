package com.southrail.reservation.repository.notification;

import com.southrail.reservation.entity.notification.Notification;
import com.southrail.reservation.entity.account.User;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface NotificationRepository extends JpaRepository<Notification, UUID> {
  List<Notification> findByUserOrderByCreatedAtDesc(User user, Pageable pageable);
}
