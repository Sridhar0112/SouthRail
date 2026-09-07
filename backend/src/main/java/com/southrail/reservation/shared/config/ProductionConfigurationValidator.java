package com.southrail.reservation.shared.config;

import jakarta.annotation.PostConstruct;
import java.util.Arrays;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

@Component
@Profile("prod")
public class ProductionConfigurationValidator {
  private final List<RequiredSetting> requiredSettings;

  public ProductionConfigurationValidator(
      @Value("${spring.mail.username}") String mailUsername,
      @Value("${spring.mail.password}") String mailPassword,
      @Value("${app.jwt.secret}") String jwtSecret) {
    this.requiredSettings = Arrays.asList(
        new RequiredSetting("MAIL_USERNAME", mailUsername),
        new RequiredSetting("MAIL_PASSWORD", mailPassword),
        new RequiredSetting("JWT_SECRET", jwtSecret));
  }

  @PostConstruct
  public void validate() {
    requiredSettings.stream()
        .filter(setting -> setting.value == null || setting.value.trim().isEmpty())
        .findFirst()
        .ifPresent(setting -> {
          throw new IllegalStateException(setting.name + " must be configured for the prod profile");
        });

    String jwtSecret = requiredSettings.get(2).value;
    if (jwtSecret.getBytes(java.nio.charset.StandardCharsets.UTF_8).length < 32) {
      throw new IllegalStateException("JWT_SECRET must contain at least 32 bytes for the prod profile");
    }
  }

  private static class RequiredSetting {
    private final String name;
    private final String value;

    private RequiredSetting(String name, String value) {
      this.name = name;
      this.value = value;
    }
  }
}
