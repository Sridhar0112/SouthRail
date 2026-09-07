package com.southrail.reservation.shared.config.properties;

import jakarta.validation.constraints.NotBlank;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

@Validated
@ConfigurationProperties(prefix = "app.mail")
public class SouthRailMailProperties {
  @NotBlank
  private String from;
  public String getFrom() { return from; }
  public void setFrom(String from) { this.from = from; }
}
