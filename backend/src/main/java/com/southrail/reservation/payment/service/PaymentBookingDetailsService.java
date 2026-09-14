package com.southrail.reservation.payment.service;

import com.southrail.reservation.entity.account.RoleName;
import com.southrail.reservation.entity.account.User;
import com.southrail.reservation.entity.booking.Booking;
import com.southrail.reservation.exception.ApiException;
import com.southrail.reservation.payment.dto.PaymentDtos.PaymentBookingDetails;
import com.southrail.reservation.payment.dto.PaymentDtos.PaymentPassenger;
import com.southrail.reservation.repository.account.UserRepository;
import com.southrail.reservation.repository.booking.BookingRepository;
import com.southrail.reservation.repository.booking.PassengerRepository;
import com.southrail.reservation.repository.train.RouteStopRepository;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PaymentBookingDetailsService {
  private final BookingRepository bookings;
  private final PassengerRepository passengers;
  private final RouteStopRepository routeStops;
  private final UserRepository users;

  public PaymentBookingDetailsService(
      BookingRepository bookings,
      PassengerRepository passengers,
      RouteStopRepository routeStops,
      UserRepository users) {
    this.bookings = bookings;
    this.passengers = passengers;
    this.routeStops = routeStops;
    this.users = users;
  }

  @Transactional(readOnly = true)
  public PaymentBookingDetails get(String email, UUID bookingId) {
    User user = users.findByEmailIgnoreCase(email)
        .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "User not found"));
    Booking booking = bookings.findById(bookingId)
        .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Booking not found"));
    if (!booking.getUser().getId().equals(user.getId())
        && !user.getRoles().contains(RoleName.ROLE_ADMIN)) {
      throw new ApiException(HttpStatus.FORBIDDEN, "Booking does not belong to this user");
    }

    var sourceStop = routeStops.findFirstByTrainAndStationOrderByStopOrderAsc(
        booking.getTrain(), booking.getSourceStation());
    var destinationStop = routeStops.findFirstByTrainAndStationOrderByStopOrderAsc(
        booking.getTrain(), booking.getDestinationStation());

    return new PaymentBookingDetails(
        booking.getId(),
        booking.getPnr(),
        booking.getTrain().getNumber(),
        booking.getTrain().getName(),
        booking.getSourceStation().getCode(),
        booking.getDestinationStation().getCode(),
        booking.getJourneyDate(),
        sourceStop.map(stop -> stop.getDepartureTime()).orElse(null),
        destinationStop.map(stop -> stop.getArrivalTime()).orElse(null),
        booking.getTravelClass(),
        booking.getQuota(),
        booking.getTotalFare(),
        passengers.findByBooking(booking).stream()
            .map(passenger -> new PaymentPassenger(
                passenger.getFullName(),
                passenger.getAge(),
                passenger.getGender(),
                passenger.getBerthPreference()))
            .toList());
  }
}
