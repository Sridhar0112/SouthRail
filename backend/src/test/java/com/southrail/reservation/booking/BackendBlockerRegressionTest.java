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
import org.junit.jupiter.api.Test;
import org.springframework.data.jpa.repository.Lock;

class BackendBlockerRegressionTest {

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
    BookingCancellationService service = new BookingCancellationService(bookings, users,
        mock(RefundCalculationService.class), notifications, mock(SeatAllocationService.class), audit);
    com.southrail.reservation.account.User user = new com.southrail.reservation.account.User();
    user.setId(UUID.randomUUID());
    Booking booking = new Booking();
    booking.setUser(user);
    booking.setStatus(BookingStatus.CANCELLED);
    when(users.findByEmailIgnoreCase("user@example.com")).thenReturn(Optional.of(user));
    when(bookings.findByPnrForUpdate("PNR")).thenReturn(Optional.of(booking));

    assertThrows(ApiException.class, () -> service.cancel("user@example.com", "PNR"));
    verify(bookings).findByPnrForUpdate("PNR");
    verify(audit, never()).log(any(), anyString(), anyString(), anyString(), anyString());
    verify(notifications, never()).notifyBookingCancelled(any(), any(), any());
  }

  @Test
  void concurrentTokenConsumersAndBookingTransitionsDeclareWriteLocks() throws Exception {
    assertWriteLock(RefreshTokenRepository.class, "findActiveByTokenHashForUpdate", String.class);
    assertWriteLock(AccountTokenRepository.class, "findOpenByHashAndTypeForUpdate",
        String.class, String.class);
    assertWriteLock(BookingRepository.class, "findByPnrForUpdate", String.class);
    assertWriteLock(TrainRepository.class, "findByIdForUpdate", UUID.class);
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
    assertTrue(concurrency.contains("ck_bookings_rac_capacity"));
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

  private static BookingDtos.BookingRequest request(Train train, Station source, Station destination) {
    return new BookingDtos.BookingRequest(train.getId().toString(), "SRC", "DST",
        LocalDate.now().plusDays(1), "3A", "GENERAL",
        List.of(new BookingDtos.PassengerRequest("Passenger", 30, "other", null)));
  }
}
