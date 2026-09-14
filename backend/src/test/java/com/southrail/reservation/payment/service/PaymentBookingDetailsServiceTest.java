package com.southrail.reservation.payment.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.southrail.reservation.entity.account.User;
import com.southrail.reservation.entity.booking.Booking;
import com.southrail.reservation.entity.booking.Passenger;
import com.southrail.reservation.entity.train.RouteStop;
import com.southrail.reservation.entity.train.Station;
import com.southrail.reservation.entity.train.Train;
import com.southrail.reservation.exception.ApiException;
import com.southrail.reservation.repository.account.UserRepository;
import com.southrail.reservation.repository.booking.BookingRepository;
import com.southrail.reservation.repository.booking.PassengerRepository;
import com.southrail.reservation.repository.train.RouteStopRepository;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class PaymentBookingDetailsServiceTest {
  private BookingRepository bookings;
  private PassengerRepository passengers;
  private RouteStopRepository routeStops;
  private UserRepository users;
  private PaymentBookingDetailsService service;
  private Booking booking;
  private User owner;

  @BeforeEach
  void setUp() {
    bookings = mock(BookingRepository.class);
    passengers = mock(PassengerRepository.class);
    routeStops = mock(RouteStopRepository.class);
    users = mock(UserRepository.class);
    service = new PaymentBookingDetailsService(bookings, passengers, routeStops, users);

    owner = new User();
    owner.setId(UUID.randomUUID());
    owner.setEmail("owner@example.com");
    Train train = new Train();
    train.setNumber("12658");
    train.setName("Chennai Mail");
    Station source = station("SBC");
    Station destination = station("MAS");
    booking = new Booking();
    booking.setId(UUID.randomUUID());
    booking.setPnr("1234567890");
    booking.setUser(owner);
    booking.setTrain(train);
    booking.setSourceStation(source);
    booking.setDestinationStation(destination);
    booking.setJourneyDate(LocalDate.now().plusDays(1));
    booking.setTravelClass("3A");
    booking.setQuota("GENERAL");
    booking.setTotalFare(new BigDecimal("1250.00"));

    RouteStop sourceStop = new RouteStop();
    sourceStop.setDepartureTime(LocalTime.of(22, 40));
    RouteStop destinationStop = new RouteStop();
    destinationStop.setArrivalTime(LocalTime.of(4, 20));
    when(routeStops.findFirstByTrainAndStationOrderByStopOrderAsc(train, source))
        .thenReturn(Optional.of(sourceStop));
    when(routeStops.findFirstByTrainAndStationOrderByStopOrderAsc(train, destination))
        .thenReturn(Optional.of(destinationStop));
    when(bookings.findById(booking.getId())).thenReturn(Optional.of(booking));
  }

  @Test
  void returnsCompleteSafePaymentPageDetailsForOwner() {
    Passenger passenger = new Passenger();
    passenger.setFullName("Test Passenger");
    passenger.setAge(30);
    passenger.setGender("MALE");
    passenger.setBerthPreference("LOWER");
    when(users.findByEmailIgnoreCase(owner.getEmail())).thenReturn(Optional.of(owner));
    when(passengers.findByBooking(booking)).thenReturn(List.of(passenger));

    var details = service.get(owner.getEmail(), booking.getId());

    assertThat(details.bookingId()).isEqualTo(booking.getId());
    assertThat(details.trainName()).isEqualTo("Chennai Mail");
    assertThat(details.sourceCode()).isEqualTo("SBC");
    assertThat(details.destinationCode()).isEqualTo("MAS");
    assertThat(details.totalFare()).isEqualByComparingTo("1250.00");
    assertThat(details.departureTime()).isEqualTo(LocalTime.of(22, 40));
    assertThat(details.arrivalTime()).isEqualTo(LocalTime.of(4, 20));
    assertThat(details.passengers()).singleElement()
        .satisfies(item -> assertThat(item.name()).isEqualTo("Test Passenger"));
  }

  @Test
  void rejectsAnotherUsersBooking() {
    User other = new User();
    other.setId(UUID.randomUUID());
    other.setEmail("other@example.com");
    when(users.findByEmailIgnoreCase(other.getEmail())).thenReturn(Optional.of(other));

    assertThatThrownBy(() -> service.get(other.getEmail(), booking.getId()))
        .isInstanceOf(ApiException.class)
        .satisfies(exception -> assertThat(((ApiException) exception).status().value())
            .isEqualTo(403));
  }

  private Station station(String code) {
    Station station = new Station();
    station.setCode(code);
    return station;
  }
}
