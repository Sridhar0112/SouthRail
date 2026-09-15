package com.southrail.reservation.dto.booking;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public final class ReservationHoldDtos {
  private ReservationHoldDtos() {}

  public record HoldPassenger(String name, int age, String gender, String berthPreference) {}

  public record HoldResponse(
      UUID holdId, String status, Instant expiresAt, String provisionalStatus,
      String reservationLabel, BigDecimal totalFare, String trainNumber, String trainName,
      String sourceCode, String destinationCode, LocalDate journeyDate, String travelClass,
      String quota, List<HoldPassenger> passengers, UUID bookingId, String pnr,
      String bookingStatus) {}
}
