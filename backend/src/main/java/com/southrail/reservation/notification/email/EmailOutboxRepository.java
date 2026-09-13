package com.southrail.reservation.notification.email;

import jakarta.persistence.LockModeType;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

interface EmailOutboxRepository extends JpaRepository<EmailOutboxMessage, UUID> {
  @Query(value = "select * from email_outbox where "
      + "(status = 'PENDING' or (status = 'PROCESSING' and next_attempt_at <= :now)) "
      + "and next_attempt_at <= :now order by created_at for update skip locked limit 1", nativeQuery = true)
  Optional<EmailOutboxMessage> lockNext(@Param("now") Instant now);

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("select m from EmailOutboxMessage m where m.id = :id")
  Optional<EmailOutboxMessage> findByIdForUpdate(@Param("id") UUID id);
}
