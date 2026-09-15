package com.southrail.reservation.config.properties;

import java.time.Duration;
import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties("razorpay.reconciliation")
public record PaymentReconciliationProperties(
    boolean enabled,
    Duration delay,
    Duration staleAfter,
    Duration creationExpiry,
    int batchSize) {
  public PaymentReconciliationProperties {
    delay = delay == null ? Duration.ofMinutes(1) : delay;
    staleAfter = staleAfter == null ? Duration.ofMinutes(5) : staleAfter;
    creationExpiry = creationExpiry == null ? Duration.ofMinutes(30) : creationExpiry;
    batchSize = batchSize <= 0 ? 20 : Math.min(batchSize, 100);
  }
}
