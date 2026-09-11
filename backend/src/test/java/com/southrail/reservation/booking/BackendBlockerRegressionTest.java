package com.southrail.reservation.booking;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.doAnswer;

import com.southrail.reservation.account.UserRepository;
import com.southrail.reservation.audit.AuditLogService;
import com.southrail.reservation.auth.AccountTokenRepository;
import com.southrail.reservation.auth.RefreshTokenRepository;
import com.southrail.reservation.booking.dto.BookingDtos;
import com.southrail.reservation.booking.inventory.BookingSeatRepository;
import com.southrail.reservation.booking.inventory.BookingSeatStatus;
import com.southrail.reservation.booking.inventory.CoachRepository;
import com.southrail.reservation.booking.inventory.SeatAllocationService;
import com.southrail.reservation.notification.NotificationService;
import com.southrail.reservation.notification.email.EmailNotificationService;
import com.southrail.reservation.shared.web.error.ApiException;
import com.southrail.reservation.train.RouteStop;
import com.southrail.reservation.train.RouteStopRepository;
import com.southrail.reservation.train.Station;
import com.southrail.reservation.train.StationRepository;
import com.southrail.reservation.train.Train;
import com.southrail.reservation.train.TrainRepository;
import jakarta.persistence.LockModeType;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDate;
import java.util.EnumSet;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.math.BigDecimal;
import com.southrail.reservation.booking.dto.RefundQuoteDto;
import org.junit.jupiter.api.Test;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.transaction.annotation.Transactional;

class BackendBlockerRegressionTest {

  @Test
  void racCapacityCountsPassengersAndKeepsPartiesAtomic() {
    BookingRepository bookings = mock(BookingRepository.class);
    PassengerRepository passengerRepository = mock(PassengerRepository.class);
    UserRepository users = mock(UserRepository.class);
    TrainRepository trains = mock(TrainRepository.class);
    StationRepository stations = mock(StationRepository.class);
    RouteStopRepository stops = mock(RouteStopRepository.class);
    SeatAllocationService allocation = mock(SeatAllocationService.class);
    BookingService service = new BookingService(bookings, passengerRepository, users, trains, stations, stops,
        allocation, mock(EmailNotificationService.class), mock(AuditLogService.class));
    Train train = train(true);
    train.setNumber("10001");
    train.setName("Test Express");
    Station source = station();
    source.setCode("SRC");
    source.setName("Source");
    Station destination = station();
    destination.setCode("DST");
    destination.setName("Destination");
    com.southrail.reservation.account.User user = new com.southrail.reservation.account.User();
    user.setId(UUID.randomUUID());
    user.setEmail("user@example.com");
    RouteStop sourceStop = stop(1);
    RouteStop destinationStop = stop(2);
    BookingDtos.BookingRequest request = request(train, source, destination);
    request.setPassengers(List.of(
        new BookingDtos.PassengerRequest("One", 30, "other", null),
        new BookingDtos.PassengerRequest("Two", 31, "other", null),
        new BookingDtos.PassengerRequest("Three", 32, "other", null)));
    when(users.findByEmailIgnoreCase(user.getEmail())).thenReturn(Optional.of(user));
    when(trains.findByIdForUpdate(train.getId())).thenReturn(Optional.of(train));
    when(stations.findByCodeIgnoreCase("SRC")).thenReturn(Optional.of(source));
    when(stations.findByCodeIgnoreCase("DST")).thenReturn(Optional.of(destination));
    when(stops.findFirstByTrainAndStationOrderByStopOrderAsc(train, source)).thenReturn(Optional.of(sourceStop));
    when(stops.findFirstByTrainAndStationOrderByStopOrderAsc(train, destination)).thenReturn(Optional.of(destinationStop));
    when(allocation.getConfiguredCapacity(train, "3A")).thenReturn(20);
    when(allocation.getAvailableSeatCount(train, request.getJourneyDate(), "3A")).thenReturn(0);
    when(bookings.countQueuedPassengers(train.getId(), request.getJourneyDate(), "3A", BookingStatus.RAC))
        .thenReturn(8L);
    when(bookings.findMaximumQueuePosition(train.getId(), request.getJourneyDate(), "3A", BookingStatus.WAITLISTED))
        .thenReturn(4);
    doAnswer(invocation -> {
      Booking saved = invocation.getArgument(0);
      saved.setId(UUID.randomUUID());
      return saved;
    }).when(bookings).save(any(Booking.class));
    when(passengerRepository.save(any(Passenger.class))).thenAnswer(invocation -> invocation.getArgument(0));

    BookingDtos.BookingResponse response = service.create(user.getEmail(), request);

    assertEquals("WAITLISTED", response.getStatus());
    assertEquals(5, response.getQueuePosition());
  }

  @Test
  void newBookingCannotBypassExistingRacQueueWhenSeatsRemain() {
    BookingRepository bookings = mock(BookingRepository.class);
    PassengerRepository passengerRepository = mock(PassengerRepository.class);
    UserRepository users = mock(UserRepository.class);
    TrainRepository trains = mock(TrainRepository.class);
    StationRepository stations = mock(StationRepository.class);
    RouteStopRepository stops = mock(RouteStopRepository.class);
    SeatAllocationService allocation = mock(SeatAllocationService.class);
    BookingService service = new BookingService(bookings, passengerRepository, users, trains, stations, stops,
        allocation, mock(EmailNotificationService.class), mock(AuditLogService.class));
    Train train = train(true);
    train.setNumber("10002");
    train.setName("FIFO Express");
    Station source = station();
    source.setCode("SRC");
    source.setName("Source");
    Station destination = station();
    destination.setCode("DST");
    destination.setName("Destination");
    com.southrail.reservation.account.User user = new com.southrail.reservation.account.User();
    user.setId(UUID.randomUUID());
    user.setEmail("fifo@example.com");
    BookingDtos.BookingRequest request = request(train, source, destination);
    when(users.findByEmailIgnoreCase(user.getEmail())).thenReturn(Optional.of(user));
    when(trains.findByIdForUpdate(train.getId())).thenReturn(Optional.of(train));
    when(stations.findByCodeIgnoreCase("SRC")).thenReturn(Optional.of(source));
    when(stations.findByCodeIgnoreCase("DST")).thenReturn(Optional.of(destination));
    when(stops.findFirstByTrainAndStationOrderByStopOrderAsc(train, source)).thenReturn(Optional.of(stop(1)));
    when(stops.findFirstByTrainAndStationOrderByStopOrderAsc(train, destination)).thenReturn(Optional.of(stop(2)));
    when(allocation.getConfiguredCapacity(train, "3A")).thenReturn(20);
    when(allocation.getAvailableSeatCount(train, request.getJourneyDate(), "3A")).thenReturn(2);
    when(bookings.countQueuedPassengers(train.getId(), request.getJourneyDate(), "3A", BookingStatus.RAC))
        .thenReturn(3L);
    when(bookings.findMaximumQueuePosition(train.getId(), request.getJourneyDate(), "3A", BookingStatus.RAC))
        .thenReturn(1);
    doAnswer(invocation -> {
      Booking saved = invocation.getArgument(0);
      saved.setId(UUID.randomUUID());
      return saved;
    }).when(bookings).save(any(Booking.class));
    when(passengerRepository.save(any(Passenger.class))).thenAnswer(invocation -> invocation.getArgument(0));

    BookingDtos.BookingResponse response = service.create(user.getEmail(), request);

    assertEquals("RAC", response.getStatus());
    assertEquals(2, response.getQueuePosition());
    verify(allocation, never()).allocateSeats(any(), any());
  }

  @Test
  void inventoryCountsPhysicalConfirmedSeatsAndOnlyConfirmedLegacyPassengers() {
    CoachRepository coaches = mock(CoachRepository.class);
    BookingSeatRepository seats = mock(BookingSeatRepository.class);
    PassengerRepository passengers = mock(PassengerRepository.class);
    Train train = train(true);
    LocalDate date = LocalDate.now().plusDays(1);
    EnumSet<BookingStatus> physicalStatuses =
        EnumSet.of(BookingStatus.CONFIRMED, BookingStatus.PARTIALLY_CANCELLED);
    when(coaches.totalCapacity(train.getId(), "3A")).thenReturn(20);
    when(seats.countActiveBookedSeats(train.getId(), date, "3A", BookingSeatStatus.BOOKED,
        physicalStatuses)).thenReturn(4L);
    when(passengers.countActivePassengersWithoutBookedSeat(train.getId(), date, "3A",
        BookingStatus.CONFIRMED, physicalStatuses, BookingSeatStatus.BOOKED)).thenReturn(3L);

    SeatAllocationService service = new SeatAllocationService(coaches, seats, passengers);

    assertEquals(13, service.getAvailableSeatCount(train, date, "3A"));
    verify(passengers).countActivePassengersWithoutBookedSeat(train.getId(), date, "3A",
        BookingStatus.CONFIRMED, physicalStatuses, BookingSeatStatus.BOOKED);
  }

  @Test
  void reviewRejectsInactiveSameMissingReversedRoutesAndUnconfiguredClass() {
    TrainRepository trains = mock(TrainRepository.class);
    StationRepository stations = mock(StationRepository.class);
    RouteStopRepository stops = mock(RouteStopRepository.class);
    SeatAllocationService allocation = mock(SeatAllocationService.class);
    BookingService service = new BookingService(mock(BookingRepository.class),
        mock(PassengerRepository.class), mock(UserRepository.class), trains, stations, stops,
        allocation, mock(EmailNotificationService.class), mock(AuditLogService.class));
    Train train = train(false);
    Station source = station();
    Station destination = station();
    BookingDtos.BookingRequest request = request(train, source, destination);
    when(trains.findById(train.getId())).thenReturn(Optional.of(train));
    when(stations.findByCodeIgnoreCase("SRC")).thenReturn(Optional.of(source));
    when(stations.findByCodeIgnoreCase("DST")).thenReturn(Optional.of(destination));
    assertThrows(ApiException.class, () -> service.review(request));

    train.setActive(true);
    request.setDestinationStationCode("SRC");
    assertThrows(ApiException.class, () -> service.review(request));

    request.setDestinationStationCode("DST");
    when(stops.findFirstByTrainAndStationOrderByStopOrderAsc(train, source))
        .thenReturn(Optional.empty());
    assertThrows(ApiException.class, () -> service.review(request));

    RouteStop sourceStop = stop(2);
    RouteStop destinationStop = stop(1);
    when(stops.findFirstByTrainAndStationOrderByStopOrderAsc(train, source))
        .thenReturn(Optional.of(sourceStop));
    when(stops.findFirstByTrainAndStationOrderByStopOrderAsc(train, destination))
        .thenReturn(Optional.of(destinationStop));
    assertThrows(ApiException.class, () -> service.review(request));

    sourceStop.setStopOrder(1);
    destinationStop.setStopOrder(2);
    when(allocation.getConfiguredCapacity(train, "3A")).thenReturn(0);
    assertThrows(ApiException.class, () -> service.review(request));
  }

  @Test
  void cancellationUsesLockedLookupBeforeRejectingDuplicateTransition() {
    BookingRepository bookings = mock(BookingRepository.class);
    UserRepository users = mock(UserRepository.class);
    AuditLogService audit = mock(AuditLogService.class);
    NotificationService notifications = mock(NotificationService.class);
    TrainRepository trains = mock(TrainRepository.class);
    PassengerRepository passengers = mock(PassengerRepository.class);
    BookingCancellationService service = new BookingCancellationService(bookings, users,
        mock(RefundCalculationService.class), notifications, mock(SeatAllocationService.class), audit,
        trains, passengers);
    com.southrail.reservation.account.User user = new com.southrail.reservation.account.User();
    user.setId(UUID.randomUUID());
    Booking booking = new Booking();
    booking.setUser(user);
    Train train = train(true);
    booking.setTrain(train);
    booking.setStatus(BookingStatus.CANCELLED);
    when(users.findByEmailIgnoreCase("user@example.com")).thenReturn(Optional.of(user));
    when(bookings.findByPnr("PNR")).thenReturn(Optional.of(booking));
    when(trains.findByIdForUpdate(train.getId())).thenReturn(Optional.of(train));
    when(bookings.findByPnrForUpdate("PNR")).thenReturn(Optional.of(booking));

    assertThrows(ApiException.class, () -> service.cancel("user@example.com", "PNR"));
    verify(bookings).findByPnrForUpdate("PNR");
    verify(audit, never()).log(any(), anyString(), anyString(), anyString(), anyString());
    verify(notifications, never()).notifyBookingCancelled(any(), any(), any());
  }

  @Test
  void racCancellationCompactsQueueAndPromotesWaitlistWithoutPositionCollision() {
    BookingRepository bookings = mock(BookingRepository.class);
    UserRepository users = mock(UserRepository.class);
    TrainRepository trains = mock(TrainRepository.class);
    PassengerRepository passengerRepository = mock(PassengerRepository.class);
    SeatAllocationService allocation = mock(SeatAllocationService.class);
    RefundCalculationService refunds = mock(RefundCalculationService.class);
    BookingCancellationService service = new BookingCancellationService(bookings, users, refunds,
        mock(NotificationService.class), allocation, mock(AuditLogService.class), trains, passengerRepository);
    com.southrail.reservation.account.User user = new com.southrail.reservation.account.User();
    user.setId(UUID.randomUUID());
    user.setEmail("user@example.com");
    Train train = train(true);
    LocalDate date = LocalDate.now().plusDays(1);
    Booking cancelled = queuedBooking(user, train, date, BookingStatus.RAC, 1);
    Booking remainingRac = queuedBooking(user, train, date, BookingStatus.RAC, 2);
    Booking waiting = queuedBooking(user, train, date, BookingStatus.WAITLISTED, 1);
    Passenger cancelledPassenger = passenger(cancelled, BookingStatus.RAC);
    Passenger racPassenger = passenger(remainingRac, BookingStatus.RAC);
    Passenger waitingPassenger = passenger(waiting, BookingStatus.WAITLISTED);
    when(users.findByEmailIgnoreCase(user.getEmail())).thenReturn(Optional.of(user));
    when(bookings.findByPnr(cancelled.getPnr())).thenReturn(Optional.of(cancelled));
    when(trains.findByIdForUpdate(train.getId())).thenReturn(Optional.of(train));
    when(bookings.findByPnrForUpdate(cancelled.getPnr())).thenReturn(Optional.of(cancelled));
    when(refunds.calculate(cancelled)).thenReturn(new RefundQuoteDto(
        BigDecimal.TEN, BigDecimal.valueOf(9), BigDecimal.ONE, BigDecimal.valueOf(90), "refund"));
    when(passengerRepository.findByBooking(cancelled)).thenReturn(List.of(cancelledPassenger));
    when(passengerRepository.findByBooking(remainingRac)).thenReturn(List.of(racPassenger));
    when(passengerRepository.findByBooking(waiting)).thenReturn(List.of(waitingPassenger));
    when(allocation.getAvailableSeatCount(train, date, "3A")).thenReturn(0);
    when(bookings.findQueueForUpdate(train.getId(), date, "3A", BookingStatus.RAC))
        .thenReturn(List.of(remainingRac), List.of(remainingRac, waiting));
    when(bookings.countQueuedPassengers(train.getId(), date, "3A", BookingStatus.RAC)).thenReturn(1L);
    when(bookings.findQueueForUpdate(train.getId(), date, "3A", BookingStatus.WAITLISTED))
        .thenReturn(List.of(waiting), List.of());
    when(passengerRepository.countByBooking(waiting)).thenReturn(1L);
    when(bookings.findMaximumQueuePosition(train.getId(), date, "3A", BookingStatus.RAC)).thenReturn(1);

    service.cancel(user.getEmail(), cancelled.getPnr());

    assertEquals(BookingStatus.CANCELLED, cancelled.getStatus());
    assertEquals(BookingStatus.CANCELLED, cancelledPassenger.getStatus());
    assertEquals(1, remainingRac.getQueuePosition());
    assertEquals(BookingStatus.RAC, waiting.getStatus());
    assertEquals(2, waiting.getQueuePosition());
    assertEquals(BookingStatus.RAC, waitingPassenger.getStatus());
  }

  @Test
  void concurrentTokenConsumersAndBookingTransitionsDeclareWriteLocks() throws Exception {
    assertWriteLock(RefreshTokenRepository.class, "findActiveByTokenHashForUpdate", String.class);
    assertWriteLock(AccountTokenRepository.class, "findOpenByHashAndTypeForUpdate",
        String.class, String.class);
    assertWriteLock(BookingRepository.class, "findByPnrForUpdate", String.class);
    assertWriteLock(TrainRepository.class, "findByIdForUpdate", UUID.class);
    assertWriteLock(UserRepository.class, "findByEmailIgnoreCaseForUpdate", String.class);
    Transactional loginTransaction = com.southrail.reservation.auth.AuthService.class
        .getMethod("login", com.southrail.reservation.auth.dto.AuthDtos.LoginRequest.class)
        .getAnnotation(Transactional.class);
    assertTrue(List.of(loginTransaction.noRollbackFor()).contains(ApiException.class));
  }

  @Test
  void sqlBackfillAndQueueConstraintsMatchInventoryAndConcurrencyRules() throws Exception {
    String backfill = Files.readString(Path.of("../database/003_booking_seats.sql"));
    assertTrue(backfill.contains("where p.status = 'CONFIRMED'"));
    assertTrue(backfill.contains("b.status in ('CONFIRMED', 'PARTIALLY_CANCELLED')"));
    assertTrue(backfill.contains("not exists"));
    String concurrency = Files.readString(Path.of("../database/005_booking_concurrency.sql"));
    assertTrue(concurrency.contains("uq_bookings_rac_queue_position"));
    assertTrue(concurrency.contains("uq_bookings_waitlist_queue_position"));
    String followUp = Files.readString(Path.of("../database/006_queue_and_token_concurrency.sql"));
    assertTrue(followUp.contains("uq_account_tokens_one_open_per_type"));
    assertTrue(followUp.contains("cumulative_passengers > 10"));
  }

  private static void assertWriteLock(Class<?> repository, String method, Class<?>... parameters)
      throws Exception {
    Lock lock = repository.getMethod(method, parameters).getAnnotation(Lock.class);
    assertEquals(LockModeType.PESSIMISTIC_WRITE, lock.value());
  }

  private static Train train(boolean active) {
    Train train = new Train();
    train.setId(UUID.randomUUID());
    train.setActive(active);
    return train;
  }

  private static Station station() {
    Station station = new Station();
    station.setId(UUID.randomUUID());
    return station;
  }

  private static RouteStop stop(int order) {
    RouteStop stop = new RouteStop();
    stop.setStopOrder(order);
    return stop;
  }

  private static Booking queuedBooking(com.southrail.reservation.account.User user, Train train,
      LocalDate date, BookingStatus status, int position) {
    Booking booking = new Booking();
    booking.setId(UUID.randomUUID());
    booking.setPnr(UUID.randomUUID().toString().substring(0, 10));
    booking.setUser(user);
    booking.setTrain(train);
    booking.setJourneyDate(date);
    booking.setTravelClass("3A");
    booking.setStatus(status);
    booking.setQueuePosition(position);
    booking.setTotalFare(BigDecimal.TEN);
    return booking;
  }

  private static Passenger passenger(Booking booking, BookingStatus status) {
    Passenger passenger = new Passenger();
    passenger.setBooking(booking);
    passenger.setStatus(status);
    return passenger;
  }

  private static BookingDtos.BookingRequest request(Train train, Station source, Station destination) {
    return new BookingDtos.BookingRequest(train.getId().toString(), "SRC", "DST",
        LocalDate.now().plusDays(1), "3A", "GENERAL",
        List.of(new BookingDtos.PassengerRequest("Passenger", 30, "other", null)));
  }
}
