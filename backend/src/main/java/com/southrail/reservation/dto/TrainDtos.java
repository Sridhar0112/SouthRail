package com.southrail.reservation.dto;

import jakarta.validation.constraints.FutureOrPresent;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

public final class TrainDtos {
  private TrainDtos() {}

  @Getter
  @Setter
  @NoArgsConstructor
  @AllArgsConstructor
  public static class SearchRequest {
    @NotBlank
    private String source;

    @NotBlank
    private String destination;

    @NotNull
    @FutureOrPresent
    private LocalDate journeyDate;

    @NotBlank
    private String travelClass;

    @NotBlank
    private String quota;
  }

  @Getter
  @Setter
  @NoArgsConstructor
  @AllArgsConstructor
  public static class TrainSearchResult {
    private String trainId;
    private String trainNumber;
    private String trainName;
    private String sourceCode;
    private String destinationCode;
    private LocalTime departureTime;
    private LocalTime arrivalTime;
    private int durationMinutes;
    private int availableSeats;
    private BigDecimal fare;
    private String prediction;
  }

  @Getter
  @Setter
  @NoArgsConstructor
  @AllArgsConstructor
  public static class RouteStopView {
    private String stationCode;
    private String stationName;
    private int stopOrder;
    private LocalTime arrivalTime;
    private LocalTime departureTime;
    private int distanceKm;
    private String platform;
  }

  @Getter
  @Setter
  @NoArgsConstructor
  @AllArgsConstructor
  public static class TrainDetail {
    private String trainId;
    private String number;
    private String name;
    private String category;
    private List<RouteStopView> route;
  }

  @Getter
  @Setter
  @NoArgsConstructor
  @AllArgsConstructor
  public static class StationOption {
    private String code;
    private String name;
    private String city;
    private String state;
  }
}
