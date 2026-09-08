package com.southrail.reservation.booking;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.southrail.reservation.account.RoleName;
import com.southrail.reservation.account.User;
import com.southrail.reservation.account.UserRepository;
import com.southrail.reservation.train.Station;
import com.southrail.reservation.train.StationRepository;
import com.southrail.reservation.train.Train;
import com.southrail.reservation.train.TrainRepository;
import java.math.BigDecimal;
import java.time.LocalDate;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class PnrAccessIntegrationTest {
  private static final String PNR = "1234567890";
  private static final String OWNER_EMAIL = "owner@example.com";
  private static final String OTHER_EMAIL = "other@example.com";
  private static final String ADMIN_EMAIL = "admin@example.com";

  @Autowired private MockMvc mockMvc;
  @Autowired private UserRepository users;
  @Autowired private TrainRepository trains;
  @Autowired private StationRepository stations;
  @Autowired private BookingRepository bookings;
  @Autowired private PassengerRepository passengers;

  @BeforeEach
  void createBooking() {
    User owner = user(OWNER_EMAIL, RoleName.ROLE_USER);
    user(OTHER_EMAIL, RoleName.ROLE_USER);
    user(ADMIN_EMAIL, RoleName.ROLE_ADMIN);

    Train train = new Train();
    train.setNumber("12658");
    train.setName("Chennai Mail");
    train.setCategory("Superfast");
    train = trains.save(train);

    Station source = station("MAS", "MGR Chennai Central", "Chennai");
    Station destination = station("SBC", "KSR Bengaluru City", "Bengaluru");

    Booking booking = new Booking();
    booking.setPnr(PNR);
    booking.setUser(owner);
    booking.setTrain(train);
    booking.setSourceStation(source);
    booking.setDestinationStation(destination);
    booking.setJourneyDate(LocalDate.now().plusDays(1));
    booking.setTravelClass("3A");
    booking.setQuota("GENERAL");
    booking.setStatus(BookingStatus.CONFIRMED);
    booking.setTotalFare(BigDecimal.valueOf(1000));
    booking.setReservationLabel("CNF");
    booking = bookings.save(booking);

    Passenger passenger = new Passenger();
    passenger.setBooking(booking);
    passenger.setFullName("Private Passenger");
    passenger.setAge(30);
    passenger.setGender("female");
    passenger.setStatus(BookingStatus.CONFIRMED);
    passengers.save(passenger);
  }

  @Test
  void rejectsUnauthenticatedAccess() throws Exception {
    mockMvc.perform(get("/pnr/{pnr}", PNR))
        .andExpect(status().isUnauthorized())
        .andExpect(jsonPath("$.errorCode").value("AUTHENTICATION_REQUIRED"));
  }

  @Test
  void allowsOwnerAccess() throws Exception {
    mockMvc.perform(get("/pnr/{pnr}", PNR).with(user(OWNER_EMAIL).roles("USER")))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.pnr").value(PNR))
        .andExpect(jsonPath("$.passengerStatuses[0]").value("Private Passenger - CONFIRMED"));
  }

  @Test
  void rejectsDifferentUserAccess() throws Exception {
    mockMvc.perform(get("/pnr/{pnr}", PNR).with(user(OTHER_EMAIL).roles("USER")))
        .andExpect(status().isForbidden())
        .andExpect(jsonPath("$.errorCode").value("API_FORBIDDEN"));
  }

  @Test
  void allowsAdminAccess() throws Exception {
    mockMvc.perform(get("/pnr/{pnr}", PNR).with(user(ADMIN_EMAIL).roles("ADMIN")))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.pnr").value(PNR));
  }

  private User user(String email, RoleName role) {
    User user = new User();
    user.setEmail(email);
    user.setFullName(email);
    user.setPasswordHash("not-used-by-mock-authentication");
    user.setEmailVerified(true);
    user.setEnabled(true);
    user.getRoles().add(role);
    return users.save(user);
  }

  private Station station(String code, String name, String city) {
    Station station = new Station();
    station.setCode(code);
    station.setName(name);
    station.setCity(city);
    station.setState("Tamil Nadu");
    return stations.save(station);
  }
}
