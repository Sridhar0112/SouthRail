package com.southrail.reservation.notification.email;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

interface EmailOutboxRepository extends JpaRepository<EmailOutboxMessage, UUID> {
  @Query(value = "select * from email_outbox where status = 'PENDING' and next_attempt_at <= :now "
      + "order by created_at for update skip locked limit 1", nativeQuery = true)
  Optional<EmailOutboxMessage> lockNext(@Param("now") Instant now);
}
