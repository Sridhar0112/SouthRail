package com.southrail.reservation.config.properties;

import java.time.Duration;
import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties("southrail.reservation-hold")
public record ReservationHoldProperties(Duration duration, Duration expiryDelay, int batchSize) {
  public ReservationHoldProperties {
    duration = duration == null ? Duration.ofMinutes(10) : duration;
    expiryDelay = expiryDelay == null ? Duration.ofSeconds(15) : expiryDelay;
    batchSize = batchSize <= 0 ? 50 : batchSize;
  }
}
