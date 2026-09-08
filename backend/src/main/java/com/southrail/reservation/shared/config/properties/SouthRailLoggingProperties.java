package com.southrail.reservation.shared.config.properties;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.AssertTrue;
import java.time.Duration;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

@Validated
@ConfigurationProperties(prefix = "southrail.logging")
public class SouthRailLoggingProperties {
  @NotNull
  private Duration slowRequestThreshold = Duration.ofSeconds(2);
  public Duration getSlowRequestThreshold() { return slowRequestThreshold; }
  public void setSlowRequestThreshold(Duration slowRequestThreshold) { this.slowRequestThreshold = slowRequestThreshold; }
  @AssertTrue(message = "slow-request-threshold must be positive")
  public boolean isSlowRequestThresholdPositive() {
    return slowRequestThreshold != null && !slowRequestThreshold.isNegative() && !slowRequestThreshold.isZero();
  }
}
