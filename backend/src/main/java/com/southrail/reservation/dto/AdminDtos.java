package com.southrail.reservation.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Set;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

public final class AdminDtos {
  private AdminDtos() {}

  @Getter
  @Setter
  @NoArgsConstructor
  @AllArgsConstructor
  public static class Summary {
    private long users;
    private long trains;
    private long routes;
    private long stations;
    private long bookings;
  }

  @Getter
  @Setter
  @NoArgsConstructor
  @AllArgsConstructor
  public static class UserRow {
    private String id;
    private String fullName;
    private String email;
    private String phone;
    private boolean enabled;
    private boolean emailVerified;
    private Set<String> roles;
  }

  @Getter
  @Setter
  @NoArgsConstructor
  @AllArgsConstructor
  public static class TrainRow {
    private String id;
    private String number;
    private String name;
    private String category;
    private boolean active;
  }

  @Getter
  @Setter
  @NoArgsConstructor
  @AllArgsConstructor
  public static class StationRow {
    private String id;
    private String code;
    private String name;
    private String city;
    private String state;
  }

  @Getter
  @Setter
  @NoArgsConstructor
  @AllArgsConstructor
  public static class RouteRow {
    private String id;
    private String routeName;
    private String trainNumber;
    private String trainName;
    private String sourceCode;
    private String destinationCode;
  }

  @Getter
  @Setter
  @NoArgsConstructor
  @AllArgsConstructor
  public static class BookingRow {
    private String id;
    private String pnr;
    private String userEmail;
    private String trainNumber;
    private String trainName;
    private String sourceCode;
    private String destinationCode;
    private LocalDate journeyDate;
    private String status;
    private BigDecimal totalFare;
  }

}
