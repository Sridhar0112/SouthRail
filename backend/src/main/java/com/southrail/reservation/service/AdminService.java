package com.southrail.reservation.service;

import com.southrail.reservation.dto.AdminDtos;
import com.southrail.reservation.repository.BookingRepository;
import com.southrail.reservation.repository.StationRepository;
import com.southrail.reservation.repository.TrainRouteRepository;
import com.southrail.reservation.repository.TrainRepository;
import com.southrail.reservation.repository.UserRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AdminService {
  private final UserRepository users;
  private final TrainRepository trains;
  private final TrainRouteRepository routes;
  private final StationRepository stations;
  private final BookingRepository bookings;

  public AdminService(UserRepository users, TrainRepository trains, TrainRouteRepository routes,
      StationRepository stations, BookingRepository bookings) {
    this.users = users;
    this.trains = trains;
    this.routes = routes;
    this.stations = stations;
    this.bookings = bookings;
  }

  @Transactional(readOnly = true)
  public AdminDtos.Summary summary() {
    return new AdminDtos.Summary(users.count(), trains.count(), routes.count(), stations.count(), bookings.count());
  }

  @Transactional(readOnly = true)
  public Page<AdminDtos.UserRow> users(Pageable pageable) {
    return users.findAll(pageable).map(user -> new AdminDtos.UserRow(
        user.getId().toString(),
        user.getFullName(),
        user.getEmail(),
        user.getPhone(),
        user.isEnabled(),
        user.isEmailVerified(),
        user.getRoles().stream().map(Enum::name).collect(java.util.stream.Collectors.toSet())));
  }

  @Transactional(readOnly = true)
  public Page<AdminDtos.TrainRow> trains(Pageable pageable) {
    return trains.findAll(pageable).map(train -> new AdminDtos.TrainRow(
        train.getId().toString(),
        train.getNumber(),
        train.getName(),
        train.getCategory(),
        train.isActive()));
  }

  @Transactional(readOnly = true)
  public Page<AdminDtos.StationRow> stations(Pageable pageable) {
    return stations.findAll(pageable).map(station -> new AdminDtos.StationRow(
        station.getId().toString(),
        station.getCode(),
        station.getName(),
        station.getCity(),
        station.getState()));
  }

  @Transactional(readOnly = true)
  public Page<AdminDtos.RouteRow> routes(Pageable pageable) {
    return routes.findAll(pageable).map(route -> new AdminDtos.RouteRow(
        route.getId().toString(),
        route.getRouteName(),
        route.getTrain().getNumber(),
        route.getTrain().getName(),
        route.getSourceStation().getCode(),
        route.getDestinationStation().getCode()));
  }

  @Transactional(readOnly = true)
  public Page<AdminDtos.BookingRow> bookings(Pageable pageable) {
    return bookings.findAll(pageable).map(booking -> new AdminDtos.BookingRow(
        booking.getId().toString(),
        booking.getPnr(),
        booking.getUser().getEmail(),
        booking.getTrain().getNumber(),
        booking.getTrain().getName(),
        booking.getSourceStation().getCode(),
        booking.getDestinationStation().getCode(),
        booking.getJourneyDate(),
        booking.getStatus().name(),
        booking.getTotalFare()));
  }
}
