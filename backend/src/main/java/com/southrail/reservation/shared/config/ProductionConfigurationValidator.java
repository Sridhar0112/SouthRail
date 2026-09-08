package com.southrail.reservation.shared.config;

import com.southrail.reservation.ai.gemini.GeminiConfiguration;
import com.southrail.reservation.shared.config.properties.SouthRailCorsProperties;
import com.southrail.reservation.shared.config.properties.SouthRailFeatureProperties;
import com.southrail.reservation.shared.config.properties.SouthRailSecurityProperties;
import jakarta.annotation.PostConstruct;
import java.nio.charset.StandardCharsets;
import java.util.List;
import org.springframework.context.annotation.Profile;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

@Component
@Profile("prod")
public class ProductionConfigurationValidator {
  private static final String EXAMPLE_DATABASE_USERNAME = "replace-with-database-user";
  private static final String EXAMPLE_DATABASE_PASSWORD = "replace-with-a-strong-database-password";
  private static final String EXAMPLE_JWT_SECRET = "replace-with-at-least-32-random-characters";
  private final String databaseUrl;
  private final String databaseUsername;
  private final String databasePassword;
  private final String mailUsername;
  private final String mailPassword;
  private final SouthRailSecurityProperties security;
  private final SouthRailCorsProperties cors;
  private final SouthRailFeatureProperties features;
  private final GeminiConfiguration gemini;

  public ProductionConfigurationValidator(Environment environment, SouthRailSecurityProperties security,
      SouthRailCorsProperties cors, SouthRailFeatureProperties features, GeminiConfiguration gemini) {
    this(environment.getProperty("spring.datasource.url"), environment.getProperty("spring.datasource.username"),
        environment.getProperty("spring.datasource.password"), environment.getProperty("spring.mail.username"),
        environment.getProperty("spring.mail.password"), security, cors, features, gemini);
  }

  ProductionConfigurationValidator(String databaseUrl, String databaseUsername, String databasePassword,
      String mailUsername, String mailPassword, SouthRailSecurityProperties security,
      SouthRailCorsProperties cors, SouthRailFeatureProperties features, GeminiConfiguration gemini) {
    this.databaseUrl = databaseUrl;
    this.databaseUsername = databaseUsername;
    this.databasePassword = databasePassword;
    this.mailUsername = mailUsername;
    this.mailPassword = mailPassword;
    this.security = security;
    this.cors = cors;
    this.features = features;
    this.gemini = gemini;
  }

  @PostConstruct
  public void validate() {
    require("DB_URL", databaseUrl);
    require("DB_USERNAME", databaseUsername);
    require("DB_PASSWORD", databasePassword);
    rejectExampleValue("DB_USERNAME", databaseUsername, EXAMPLE_DATABASE_USERNAME);
    rejectExampleValue("DB_PASSWORD", databasePassword, EXAMPLE_DATABASE_PASSWORD);
    require("JWT_ISSUER", security.getIssuer());
    require("JWT_SECRET", security.getSecret());
    if (security.getSecret().getBytes(StandardCharsets.UTF_8).length < 32
        || security.getSecret().toLowerCase(java.util.Locale.ROOT).contains("change-before-use")
        || EXAMPLE_JWT_SECRET.equals(security.getSecret().trim())) {
      throw new IllegalStateException("JWT_SECRET does not meet production strength requirements");
    }
    List<String> origins = cors.getAllowedOrigins();
    if (origins == null || origins.isEmpty()) {
      throw new IllegalStateException("CORS_ALLOWED_ORIGINS must contain an explicit production origin");
    }
    for (String origin : origins) {
      require("CORS_ALLOWED_ORIGINS", origin);
      if ("*".equals(origin.trim())) {
        throw new IllegalStateException("CORS wildcard is forbidden when credentials are enabled");
      }
    }
    if (features.isAiEnabled()) {
      require("GEMINI_API_KEY", gemini.getApiKey());
    }
    if (features.isEmailEnabled()) {
      require("SMTP_USERNAME", mailUsername);
      require("SMTP_PASSWORD", mailPassword);
    }
  }

  private void require(String name, String value) {
    if (value == null || value.trim().isEmpty()) {
      throw new IllegalStateException(name + " must be configured for the prod profile");
    }
  }

  private void rejectExampleValue(String name, String value, String exampleValue) {
    if (exampleValue.equals(value.trim())) {
      throw new IllegalStateException(name + " must not use the shipped example value in the prod profile");
    }
  }
}
