package com.southrail.reservation.repository.payment;
import com.southrail.reservation.entity.payment.*; import java.util.*; import org.springframework.data.jpa.repository.JpaRepository;
public interface PaymentRefundRepository extends JpaRepository<PaymentRefund,UUID>{
 Optional<PaymentRefund> findByIdempotencyKey(String key); Optional<PaymentRefund> findByProviderRefundId(String id);
 java.util.List<PaymentRefund> findTop20ByStatusInOrderByCreatedAt(java.util.Collection<RefundStatus> statuses);
 @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
 @org.springframework.data.jpa.repository.Query("select r from PaymentRefund r join fetch r.payment p join fetch r.booking where r.id=:id")
 Optional<PaymentRefund> findByIdForUpdate(@org.springframework.data.repository.query.Param("id") UUID id);
}
