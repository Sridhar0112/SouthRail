package com.southrail.reservation.repository;

import com.southrail.reservation.entity.Booking;
import com.southrail.reservation.entity.BookingSeatStatus;
import com.southrail.reservation.entity.BookingStatus;
import com.southrail.reservation.entity.Passenger;
import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface PassengerRepository extends JpaRepository<Passenger, UUID> {
  List<Passenger> findByBooking(Booking booking);

  default long countBookedPassengers(UUID trainId, LocalDate journeyDate, String travelClass) {
    return countBookedPassengersExcludingStatus(trainId, journeyDate, travelClass, BookingStatus.CANCELLED);
  }

  @Query("""
      select count(p)
      from Passenger p
      where p.booking.train.id = :trainId
        and p.booking.journeyDate = :journeyDate
        and upper(p.booking.travelClass) = upper(:travelClass)
        and p.booking.status <> :excludedStatus
      """)
  long countBookedPassengersExcludingStatus(
      @Param("trainId") UUID trainId,
      @Param("journeyDate") LocalDate journeyDate,
      @Param("travelClass") String travelClass,
      @Param("excludedStatus") BookingStatus excludedStatus);

  @Query("""
      select count(p)
      from Passenger p
      where p.booking.train.id = :trainId
        and p.booking.journeyDate = :journeyDate
        and upper(p.booking.travelClass) = upper(:travelClass)
        and p.booking.status in :activeBookingStatuses
        and not exists (
          select bs.id
          from BookingSeat bs
          where bs.passenger = p
            and bs.status = :bookedSeatStatus
        )
      """)
  long countActivePassengersWithoutBookedSeat(
      @Param("trainId") UUID trainId,
      @Param("journeyDate") LocalDate journeyDate,
      @Param("travelClass") String travelClass,
      @Param("activeBookingStatuses") Collection<BookingStatus> activeBookingStatuses,
      @Param("bookedSeatStatus") BookingSeatStatus bookedSeatStatus);
}
