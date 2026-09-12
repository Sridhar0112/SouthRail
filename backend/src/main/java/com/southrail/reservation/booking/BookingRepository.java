package com.southrail.reservation.booking;

import com.southrail.reservation.booking.Booking;
import com.southrail.reservation.account.User;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import com.southrail.reservation.booking.BookingStatus;
import java.time.LocalDate;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.data.jpa.repository.Modifying;
import java.util.List;
public interface BookingRepository extends JpaRepository<Booking, UUID> {
  Optional<Booking> findByPnr(String pnr);
  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("select b from Booking b where b.pnr = :pnr")
  Optional<Booking> findByPnrForUpdate(@Param("pnr") String pnr);
  Page<Booking> findByUserOrderByCreatedAtDesc(User user, Pageable pageable);
  long countByTrainIdAndJourneyDateAndTravelClassAndStatus(
          UUID trainId,
          LocalDate journeyDate,
          String travelClass,
          BookingStatus status
  );

  @Query("select coalesce(max(b.queuePosition), 0) from Booking b where b.train.id = :trainId and b.journeyDate = :journeyDate and upper(b.travelClass) = upper(:travelClass) and b.status = :status")
  int findMaximumQueuePosition(@Param("trainId") UUID trainId, @Param("journeyDate") LocalDate journeyDate,
      @Param("travelClass") String travelClass, @Param("status") BookingStatus status);

  @Query("select count(p) from Passenger p where p.booking.train.id = :trainId and p.booking.journeyDate = :journeyDate and upper(p.booking.travelClass) = upper(:travelClass) and p.booking.status = :status and p.status = :status")
  long countQueuedPassengers(@Param("trainId") UUID trainId, @Param("journeyDate") LocalDate journeyDate,
      @Param("travelClass") String travelClass, @Param("status") BookingStatus status);

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("select b from Booking b join fetch b.user where b.train.id = :trainId and b.journeyDate = :journeyDate and upper(b.travelClass) = upper(:travelClass) and b.status = :status order by b.queuePosition asc, b.createdAt asc, b.pnr asc")
  List<Booking> findQueueForUpdate(@Param("trainId") UUID trainId, @Param("journeyDate") LocalDate journeyDate,
      @Param("travelClass") String travelClass, @Param("status") BookingStatus status);

  @Modifying(flushAutomatically = true, clearAutomatically = true)
  @Query(value = "with staged as ("
      + " select id, (select coalesce(max(queue_position::bigint), 0) from bookings"
      + " where queue_position is not null) + row_number() over ("
      + " order by queue_position, created_at, pnr, id) as temporary_position"
      + " from bookings where train_id = :trainId and journey_date = :journeyDate"
      + " and upper(travel_class) = upper(:travelClass) and status = :status"
      + ") update bookings b set queue_position = staged.temporary_position::integer, updated_at = now()"
      + " from staged where b.id = staged.id", nativeQuery = true)
  void moveQueueToTemporaryRange(@Param("trainId") UUID trainId, @Param("journeyDate") LocalDate journeyDate,
      @Param("travelClass") String travelClass, @Param("status") String status);
}
