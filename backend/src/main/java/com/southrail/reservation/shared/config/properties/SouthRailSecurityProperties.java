package com.southrail.reservation.shared.config.properties;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

@Validated
@ConfigurationProperties(prefix = "app.jwt")
public class SouthRailSecurityProperties {
  @NotBlank
  private String issuer;
  @NotBlank
  private String secret;
  @Positive
  private long accessTokenMinutes;
  @Positive
  private long refreshTokenDays;

  public String getIssuer() { return issuer; }
  public void setIssuer(String issuer) { this.issuer = issuer; }
  public String getSecret() { return secret; }
  public void setSecret(String secret) { this.secret = secret; }
  public long getAccessTokenMinutes() { return accessTokenMinutes; }
  public void setAccessTokenMinutes(long accessTokenMinutes) { this.accessTokenMinutes = accessTokenMinutes; }
  public long getRefreshTokenDays() { return refreshTokenDays; }
  public void setRefreshTokenDays(long refreshTokenDays) { this.refreshTokenDays = refreshTokenDays; }
}
