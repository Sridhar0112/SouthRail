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
public interface BookingRepository extends JpaRepository<Booking, UUID> {
  Optional<Booking> findByPnr(String pnr);
  Page<Booking> findByUserOrderByCreatedAtDesc(User user, Pageable pageable);
  long countByTrainIdAndJourneyDateAndTravelClassAndStatus(
          UUID trainId,
          LocalDate journeyDate,
          String travelClass,
          BookingStatus status
  );
}
