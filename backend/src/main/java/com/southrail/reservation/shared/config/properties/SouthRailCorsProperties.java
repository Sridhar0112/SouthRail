package com.southrail.reservation.shared.config.properties;

import jakarta.validation.constraints.NotEmpty;
import java.util.ArrayList;
import java.util.List;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

@Validated
@ConfigurationProperties(prefix = "app.cors")
public class SouthRailCorsProperties {
  @NotEmpty
  private List<String> allowedOrigins = new ArrayList<>();
  public List<String> getAllowedOrigins() { return allowedOrigins; }
  public void setAllowedOrigins(List<String> allowedOrigins) { this.allowedOrigins = allowedOrigins; }
}
