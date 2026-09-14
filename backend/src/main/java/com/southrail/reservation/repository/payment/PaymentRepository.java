package com.southrail.reservation.repository.payment;

import com.southrail.reservation.entity.payment.Payment;
import com.southrail.reservation.entity.payment.PaymentStatus;
import jakarta.persistence.LockModeType;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface PaymentRepository extends JpaRepository<Payment, UUID> {
  Optional<Payment> findByIdempotencyKey(String key);

  Optional<Payment> findByProviderOrderId(String id);

  Optional<Payment> findByProviderPaymentId(String id);

  Optional<Payment> findFirstByBookingIdAndStatusOrderByCreatedAtDesc(
      UUID bookingId, PaymentStatus status);

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("select p from Payment p join fetch p.booking b join fetch b.user where p.id = :id")
  Optional<Payment> findByIdForUpdate(@Param("id") UUID id);

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("select p from Payment p join fetch p.booking b join fetch b.user "
      + "where p.providerOrderId = :id")
  Optional<Payment> findByProviderOrderIdForUpdate(@Param("id") String id);
}
