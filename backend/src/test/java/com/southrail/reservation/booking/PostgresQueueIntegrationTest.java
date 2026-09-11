package com.southrail.reservation.booking;

import static org.assertj.core.api.Assertions.assertThat;

import com.southrail.reservation.account.RoleName;
import com.southrail.reservation.account.User;
import com.southrail.reservation.account.UserRepository;
import com.southrail.reservation.train.Station;
import com.southrail.reservation.train.StationRepository;
import com.southrail.reservation.train.Train;
import com.southrail.reservation.train.TrainRepository;
import java.math.BigDecimal;
import java.nio.file.Path;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import javax.sql.DataSource;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.core.io.FileSystemResource;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.init.ScriptUtils;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

@SpringBootTest
@ActiveProfiles("test")
@Testcontainers(disabledWithoutDocker = true)
class PostgresQueueIntegrationTest {

  @Container
  static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:16-alpine");

  @DynamicPropertySource
  static void postgresProperties(DynamicPropertyRegistry registry) {
    registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
    registry.add("spring.datasource.username", POSTGRES::getUsername);
    registry.add("spring.datasource.password", POSTGRES::getPassword);
    registry.add("spring.datasource.driver-class-name", () -> "org.postgresql.Driver");
  }

  @Autowired private DataSource dataSource;
  @Autowired private UserRepository users;
  @Autowired private TrainRepository trains;
  @Autowired private StationRepository stations;
  @Autowired private BookingRepository bookings;
  @Autowired private PassengerRepository passengers;
  @Autowired private BookingCancellationService cancellations;
  @Autowired private JdbcTemplate jdbc;

  @BeforeEach
  void installProductionQueueIndexesAndMigrations() throws Exception {
    try (java.sql.Connection connection = dataSource.getConnection()) {
      ScriptUtils.executeSqlScript(connection,
          new FileSystemResource(Path.of("../database/005_booking_concurrency.sql")));
      ScriptUtils.executeSqlScript(connection,
          new FileSystemResource(Path.of("../database/006_queue_and_token_concurrency.sql")));
    }
  }

  @Test
  void waitlistPromotionIsFlushSafeAgainstPostgresPartialIndexes() {
    User user = user();
    Train train = train();
    Station source = station("SRC");
    Station destination = station("DST");
    LocalDate date = LocalDate.now().plusDays(30);

    Booking rac1 = queuedBooking(user, train, source, destination, date, "RAC-000001", BookingStatus.RAC, 1);
    Booking rac2 = queuedBooking(user, train, source, destination, date, "RAC-000002", BookingStatus.RAC, 2);
    Booking wl1 = queuedBooking(user, train, source, destination, date, "WL-0000001", BookingStatus.WAITLISTED, 1);
    Booking wl2 = queuedBooking(user, train, source, destination, date, "WL-0000002", BookingStatus.WAITLISTED, 2);
    passenger(rac1, BookingStatus.RAC, "RAC One");
    passenger(rac2, BookingStatus.RAC, "RAC Two");
    passenger(wl1, BookingStatus.WAITLISTED, "WL One");
    passenger(wl2, BookingStatus.WAITLISTED, "WL Two");

    cancellations.cancel(user.getEmail(), rac2.getPnr());

    List<Map<String, Object>> queue = jdbc.queryForList(
        "select pnr, status, queue_position, reservation_label from bookings "
            + "where train_id = ? and journey_date = ? and travel_class = ? and status = 'RAC' "
            + "order by queue_position",
        train.getId(), date, "3A");
    assertThat(queue).extracting(row -> row.get("pnr"))
        .containsExactly(rac1.getPnr(), wl1.getPnr(), wl2.getPnr());
    assertThat(queue).extracting(row -> ((Number) row.get("queue_position")).intValue())
        .containsExactly(1, 2, 3);
    assertThat(queue).extracting(row -> row.get("reservation_label"))
        .containsExactly("RAC 1", "RAC 2", "RAC 3");
    assertThat(jdbc.queryForObject(
        "select count(*) from (select queue_position from bookings where train_id = ? "
            + "and journey_date = ? and travel_class = ? and status = 'RAC' "
            + "group by queue_position having count(*) > 1) duplicates",
        Integer.class, train.getId(), date, "3A")).isZero();
    assertThat(jdbc.queryForList(
        "select b.status as booking_status, p.status as passenger_status from bookings b "
            + "join passengers p on p.booking_id = b.id where b.id in (?, ?, ?)",
        rac1.getId(), wl1.getId(), wl2.getId()))
        .allSatisfy(row -> assertThat(row.get("passenger_status")).isEqualTo(row.get("booking_status")));
  }

  private User user() {
    User user = new User();
    user.setEmail("postgres-queue@southrail.invalid");
    user.setFullName("Queue Owner");
    user.setPasswordHash("not-used");
    user.setEmailVerified(true);
    user.getRoles().add(RoleName.ROLE_USER);
    return users.saveAndFlush(user);
  }

  private Train train() {
    Train train = new Train();
    train.setNumber("PG4401");
    train.setName("Postgres Queue Express");
    train.setCategory("TEST");
    return trains.saveAndFlush(train);
  }

  private Station station(String code) {
    Station station = new Station();
    station.setCode(code);
    station.setName(code + " Station");
    station.setCity("Test City");
    station.setState("Test State");
    return stations.saveAndFlush(station);
  }

  private Booking queuedBooking(User user, Train train, Station source, Station destination,
      LocalDate date, String pnr, BookingStatus status, int position) {
    Booking booking = new Booking();
    booking.setUser(user);
    booking.setTrain(train);
    booking.setSourceStation(source);
    booking.setDestinationStation(destination);
    booking.setJourneyDate(date);
    booking.setTravelClass("3A");
    booking.setQuota("GENERAL");
    booking.setPnr(pnr);
    booking.setStatus(status);
    booking.setQueuePosition(position);
    booking.setReservationLabel(status == BookingStatus.RAC ? "RAC " + position : "WL " + position);
    booking.setTotalFare(BigDecimal.valueOf(100));
    return bookings.saveAndFlush(booking);
  }

  private Passenger passenger(Booking booking, BookingStatus status, String name) {
    Passenger passenger = new Passenger();
    passenger.setBooking(booking);
    passenger.setFullName(name);
    passenger.setAge(30);
    passenger.setGender("other");
    passenger.setStatus(status);
    return passengers.saveAndFlush(passenger);
  }
}
