package com.southrail.reservation.repository.payment;

import com.southrail.reservation.entity.payment.PaymentRefund;
import com.southrail.reservation.entity.payment.RefundStatus;
import jakarta.persistence.LockModeType;
import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface PaymentRefundRepository extends JpaRepository<PaymentRefund, UUID> {
  Optional<PaymentRefund> findByIdempotencyKey(String key);

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("select r from PaymentRefund r join fetch r.payment p left join fetch r.booking b "
      + "left join fetch b.user left join fetch p.reservationHold h left join fetch h.user where r.providerRefundId = :id")
  Optional<PaymentRefund> findByProviderRefundIdForUpdate(@Param("id") String id);

  Optional<PaymentRefund> findByPaymentId(UUID paymentId);

  List<PaymentRefund> findTop20ByStatusInOrderByCreatedAt(Collection<RefundStatus> statuses);

  @Query("select r from PaymentRefund r where r.status in :statuses "
      + "and (r.status <> com.southrail.reservation.entity.payment.RefundStatus.PROCESSING "
      + "or r.updatedAt < :staleBefore) order by r.createdAt")
  List<PaymentRefund> findDispatchable(
      @Param("statuses") Collection<RefundStatus> statuses,
      @Param("staleBefore") Instant staleBefore);

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("select r from PaymentRefund r join fetch r.payment p left join fetch r.booking "
      + "left join fetch p.reservationHold "
      + "where r.id = :id")
  Optional<PaymentRefund> findByIdForUpdate(@Param("id") UUID id);
}
