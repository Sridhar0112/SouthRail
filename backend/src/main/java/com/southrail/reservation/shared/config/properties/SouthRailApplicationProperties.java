package com.southrail.reservation.shared.config.properties;

import jakarta.validation.constraints.NotBlank;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

@Validated
@ConfigurationProperties(prefix = "app")
public class SouthRailApplicationProperties {
  @NotBlank
  private String frontendUrl;
  public String getFrontendUrl() { return frontendUrl; }
  public void setFrontendUrl(String frontendUrl) { this.frontendUrl = frontendUrl; }
}
