package com.southrail.reservation.config.properties;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties("razorpay")
public record RazorpayProperties(
    boolean enabled,
    String keyId,
    String keySecret,
    String webhookSecret,
    String baseUrl) {
  public RazorpayProperties {
    baseUrl = baseUrl == null || baseUrl.isBlank() ? "https://api.razorpay.com/v1" : baseUrl;
  }
}
