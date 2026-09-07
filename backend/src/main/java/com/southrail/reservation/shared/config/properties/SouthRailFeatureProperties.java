package com.southrail.reservation.shared.config.properties;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "southrail.features")
public class SouthRailFeatureProperties {
  private boolean aiEnabled;
  private boolean emailEnabled;
  public boolean isAiEnabled() { return aiEnabled; }
  public void setAiEnabled(boolean aiEnabled) { this.aiEnabled = aiEnabled; }
  public boolean isEmailEnabled() { return emailEnabled; }
  public void setEmailEnabled(boolean emailEnabled) { this.emailEnabled = emailEnabled; }
}
