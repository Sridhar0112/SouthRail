package com.southrail.reservation.booking.inventory;

import com.southrail.reservation.booking.Booking;
import com.southrail.reservation.booking.inventory.BookingSeat;
import com.southrail.reservation.booking.inventory.BookingSeatStatus;
import com.southrail.reservation.booking.BookingStatus;
import com.southrail.reservation.booking.inventory.Coach;
import com.southrail.reservation.train.Train;
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

  @Query("select count(bs)\n" +
                "from BookingSeat bs\n" +
                "where bs.train.id = :trainId\n" +
                "  and bs.journeyDate = :journeyDate\n" +
                "  and upper(bs.travelClass) = upper(:travelClass)\n" +
                "  and bs.status = :seatStatus\n" +
                "  and bs.passenger.status = com.southrail.reservation.booking.BookingStatus.CONFIRMED\n" +
                "  and bs.booking.status in :activeBookingStatuses\n")
  long countActiveBookedSeats(
      @Param("trainId") UUID trainId,
      @Param("journeyDate") LocalDate journeyDate,
      @Param("travelClass") String travelClass,
      @Param("seatStatus") BookingSeatStatus seatStatus,
      @Param("activeBookingStatuses") Collection<BookingStatus> activeBookingStatuses);

  @Query("select bs\n" +
                "from BookingSeat bs\n" +
                "where bs.train.id = :trainId\n" +
                "  and bs.journeyDate = :journeyDate\n" +
                "  and upper(bs.travelClass) = upper(:travelClass)\n" +
                "  and bs.status = :seatStatus\n" +
                "  and bs.passenger.status = com.southrail.reservation.booking.BookingStatus.CONFIRMED\n" +
                "  and bs.booking.status in :activeBookingStatuses\n" +
                "order by bs.coachCode asc, bs.seatNumber asc\n")
  List<BookingSeat> findActiveBookedSeats(
      @Param("trainId") UUID trainId,
      @Param("journeyDate") LocalDate journeyDate,
      @Param("travelClass") String travelClass,
      @Param("seatStatus") BookingSeatStatus seatStatus,
      @Param("activeBookingStatuses") Collection<BookingStatus> activeBookingStatuses);
}
