package com.southrail.reservation.repository.booking;

import com.southrail.reservation.entity.account.User;
import com.southrail.reservation.entity.booking.ReservationHold;
import jakarta.persistence.LockModeType;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ReservationHoldRepository extends JpaRepository<ReservationHold, UUID> {
  Optional<ReservationHold> findByUserAndIdempotencyKey(User user, String key);

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("select h from ReservationHold h join fetch h.user where h.id = :id")
  Optional<ReservationHold> findByIdForUpdate(@Param("id") UUID id);

  @Query("select count(hp) from ReservationHold h join h.passengers hp where "
      + "h.train.id=:trainId and h.journeyDate=:date and upper(h.travelClass)=upper(:travelClass) "
      + "and h.status=com.southrail.reservation.entity.booking.ReservationHoldStatus.ACTIVE "
      + "and h.expiresAt>:now and h.provisionalStatus=com.southrail.reservation.entity.booking.BookingStatus.CONFIRMED")
  long countConfirmedHeldPassengers(@Param("trainId") UUID trainId, @Param("date") LocalDate date,
      @Param("travelClass") String travelClass, @Param("now") Instant now);

  @Query("select h.id from ReservationHold h where h.status=com.southrail.reservation.entity.booking.ReservationHoldStatus.ACTIVE "
      + "and h.expiresAt<=:now order by h.expiresAt")
  List<UUID> findExpiredCandidates(@Param("now") Instant now, Pageable pageable);
}
