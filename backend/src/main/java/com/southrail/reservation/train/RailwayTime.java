package com.southrail.reservation.train;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;

/** Converts timetable-local values to absolute instants. */
public final class RailwayTime {
  public static final ZoneId ZONE = ZoneId.of("Asia/Kolkata");

  private RailwayTime() {}

  public static Instant departureInstant(LocalDate journeyDate, int dayOffset,
      LocalTime departureTime) {
    return journeyDate.plusDays(dayOffset).atTime(departureTime).atZone(ZONE).toInstant();
  }
}
