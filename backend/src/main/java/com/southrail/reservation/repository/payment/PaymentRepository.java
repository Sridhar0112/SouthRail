package com.southrail.reservation.repository.payment;

import com.southrail.reservation.entity.payment.Payment;
import com.southrail.reservation.entity.payment.PaymentStatus;
import jakarta.persistence.LockModeType;
import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface PaymentRepository extends JpaRepository<Payment, UUID> {
  Optional<Payment> findByIdempotencyKey(String key);

  Optional<Payment> findByProviderOrderId(String id);

  Optional<Payment> findByProviderPaymentId(String id);

  @Query("select p.id from Payment p where "
      + "(p.status = com.southrail.reservation.entity.payment.PaymentStatus.CREATED "
      + "and p.createdAt < :creationExpiredBefore) or "
      + "(p.status in :providerStatuses and p.updatedAt < :providerStaleBefore) "
      + "order by p.createdAt")
  List<UUID> findReconciliationCandidates(
      @Param("creationExpiredBefore") Instant creationExpiredBefore,
      @Param("providerStatuses") Collection<PaymentStatus> providerStatuses,
      @Param("providerStaleBefore") Instant providerStaleBefore,
      Pageable pageable);

  Optional<Payment> findFirstByBookingIdAndStatusOrderByCreatedAtDesc(
      UUID bookingId, PaymentStatus status);

  Optional<Payment> findFirstByBookingIdAndStatusInOrderByCreatedAtDesc(
      UUID bookingId, Collection<PaymentStatus> statuses);

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("select p from Payment p join fetch p.booking b join fetch b.user "
      + "where b.id = :bookingId and p.status in :statuses order by p.createdAt desc")
  Optional<Payment> findFinancialPaymentForUpdate(
      @Param("bookingId") UUID bookingId,
      @Param("statuses") Collection<PaymentStatus> statuses);

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("select p from Payment p join fetch p.booking b join fetch b.user where p.id = :id")
  Optional<Payment> findByIdForUpdate(@Param("id") UUID id);

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("select p from Payment p join fetch p.booking b join fetch b.user "
      + "where p.providerOrderId = :id")
  Optional<Payment> findByProviderOrderIdForUpdate(@Param("id") String id);
}
