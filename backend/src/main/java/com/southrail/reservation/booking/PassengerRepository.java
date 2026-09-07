package com.southrail.reservation.booking;

import com.southrail.reservation.booking.Booking;
import com.southrail.reservation.booking.inventory.BookingSeatStatus;
import com.southrail.reservation.booking.BookingStatus;
import com.southrail.reservation.booking.Passenger;
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

  @Query("select count(p)\n" +
                "from Passenger p\n" +
                "where p.booking.train.id = :trainId\n" +
                "  and p.booking.journeyDate = :journeyDate\n" +
                "  and upper(p.booking.travelClass) = upper(:travelClass)\n" +
                "  and p.booking.status <> :excludedStatus\n")
  long countBookedPassengersExcludingStatus(
      @Param("trainId") UUID trainId,
      @Param("journeyDate") LocalDate journeyDate,
      @Param("travelClass") String travelClass,
      @Param("excludedStatus") BookingStatus excludedStatus);

  @Query("select count(p)\n" +
                "from Passenger p\n" +
                "where p.booking.train.id = :trainId\n" +
                "  and p.booking.journeyDate = :journeyDate\n" +
                "  and upper(p.booking.travelClass) = upper(:travelClass)\n" +
                "  and p.booking.status in :activeBookingStatuses\n" +
                "  and not exists (\n" +
                "    select bs.id\n" +
                "    from BookingSeat bs\n" +
                "    where bs.passenger = p\n" +
                "      and bs.status = :bookedSeatStatus\n" +
                "  )\n")
  long countActivePassengersWithoutBookedSeat(
      @Param("trainId") UUID trainId,
      @Param("journeyDate") LocalDate journeyDate,
      @Param("travelClass") String travelClass,
      @Param("activeBookingStatuses") Collection<BookingStatus> activeBookingStatuses,
      @Param("bookedSeatStatus") BookingSeatStatus bookedSeatStatus);
}
