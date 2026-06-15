package com.southrail.reservation.repository;

import com.southrail.reservation.entity.Booking;
import com.southrail.reservation.entity.BookingSeat;
import com.southrail.reservation.entity.BookingSeatStatus;
import com.southrail.reservation.entity.BookingStatus;
import com.southrail.reservation.entity.Coach;
import com.southrail.reservation.entity.Train;
import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface BookingSeatRepository extends JpaRepository<BookingSeat, UUID> {
  List<BookingSeat> findByBooking(Booking booking);

  List<BookingSeat> findByBookingId(UUID bookingId);

  List<BookingSeat> findByPassengerId(UUID passengerId);

  boolean existsByTrainAndJourneyDateAndCoachAndSeatNumberAndStatus(
      Train train, LocalDate journeyDate, Coach coach, int seatNumber, BookingSeatStatus status);

  @Query("""
      select count(bs)
      from BookingSeat bs
      where bs.train.id = :trainId
        and bs.journeyDate = :journeyDate
        and upper(bs.travelClass) = upper(:travelClass)
        and bs.status = :seatStatus
        and bs.booking.status in :activeBookingStatuses
      """)
  long countActiveBookedSeats(
      @Param("trainId") UUID trainId,
      @Param("journeyDate") LocalDate journeyDate,
      @Param("travelClass") String travelClass,
      @Param("seatStatus") BookingSeatStatus seatStatus,
      @Param("activeBookingStatuses") Collection<BookingStatus> activeBookingStatuses);

  @Query("""
      select bs
      from BookingSeat bs
      where bs.train.id = :trainId
        and bs.journeyDate = :journeyDate
        and upper(bs.travelClass) = upper(:travelClass)
        and bs.status = :seatStatus
        and bs.booking.status in :activeBookingStatuses
      order by bs.coachCode asc, bs.seatNumber asc
      """)
  List<BookingSeat> findActiveBookedSeats(
      @Param("trainId") UUID trainId,
      @Param("journeyDate") LocalDate journeyDate,
      @Param("travelClass") String travelClass,
      @Param("seatStatus") BookingSeatStatus seatStatus,
      @Param("activeBookingStatuses") Collection<BookingStatus> activeBookingStatuses);
}
