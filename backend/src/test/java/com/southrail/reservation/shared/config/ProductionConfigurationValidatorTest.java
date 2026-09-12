package com.southrail.reservation.shared.config;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.southrail.reservation.ai.gemini.GeminiConfiguration;
import com.southrail.reservation.shared.config.properties.SouthRailCorsProperties;
import com.southrail.reservation.shared.config.properties.SouthRailFeatureProperties;
import com.southrail.reservation.shared.config.properties.SouthRailSecurityProperties;
import java.util.Collections;
import org.junit.jupiter.api.Test;

class ProductionConfigurationValidatorTest {
  @Test
  void rejectsEmailDisabledProductionBecauseVerificationWouldBeUnusable() {
    assertThatThrownBy(() -> validator(false, false, strongSecret(), "issuer", "https://app.example", "", "").validate())
        .hasMessage("EMAIL_ENABLED must be true in prod because account verification requires email delivery");
  }

  @Test
  void rejectsMissingDatabaseConfiguration() {
    ProductionConfigurationValidator validator = validator(false, false, strongSecret(), "issuer",
        "https://app.example", "", "", null);
    assertThatThrownBy(validator::validate).hasMessage("DB_URL must be configured for the prod profile");
  }

  @Test
  void rejectsWeakJwtSecretAndMissingIssuer() {
    assertThatThrownBy(() -> validator(false, false, "too-short", "issuer", "https://app.example", "", "").validate())
        .hasMessage("JWT_SECRET does not meet production strength requirements");
    assertThatThrownBy(() -> validator(false, false, strongSecret(), " ", "https://app.example", "", "").validate())
        .hasMessage("JWT_ISSUER must be configured for the prod profile");
    assertThatThrownBy(() -> validator(false, false,
        "local-development-secret-change-before-use", "issuer", "https://app.example", "", "").validate())
        .hasMessage("JWT_SECRET does not meet production strength requirements");
    assertThatThrownBy(() -> validator(false, false,
        "replace-with-at-least-32-random-characters", "issuer", "https://app.example", "", "").validate())
        .hasMessage("JWT_SECRET does not meet production strength requirements");
  }

  @Test
  void rejectsShippedDatabaseCredentialPlaceholders() {
    assertThatThrownBy(() -> validatorWithDatabaseCredentials(
        "replace-with-database-user", "db-password").validate())
        .hasMessage("DB_USERNAME must not use the shipped example value in the prod profile");
    assertThatThrownBy(() -> validatorWithDatabaseCredentials(
        "db-user", "replace-with-a-strong-database-password").validate())
        .hasMessage("DB_PASSWORD must not use the shipped example value in the prod profile");
  }

  @Test
  void acceptsCustomDatabaseCredentials() {
    assertThatCode(() -> validatorWithDatabaseCredentials("custom-user", "custom-password").validate())
        .doesNotThrowAnyException();
  }

  @Test
  void rejectsCredentialedCorsWildcard() {
    assertThatThrownBy(() -> validator(false, false, strongSecret(), "issuer", "*", "", "").validate())
        .hasMessage("CORS wildcard is forbidden when credentials are enabled");
  }

  @Test
  void enabledOptionalIntegrationsRequireCredentials() {
    assertThatThrownBy(() -> validator(true, false, strongSecret(), "issuer", "https://app.example", "", "").validate())
        .hasMessage("GEMINI_API_KEY must be configured for the prod profile");
    assertThatThrownBy(() -> validator(false, true, strongSecret(), "issuer", "https://app.example", "", "").validate())
        .hasMessage("SMTP_USERNAME must be configured for the prod profile");
  }

  @Test
  void acceptsEnabledOptionalIntegrationsWithCredentials() {
    assertThatCode(() -> validator(true, true, strongSecret(), "issuer", "https://app.example",
        "gemini-key", "smtp-user").validate()).doesNotThrowAnyException();
  }

  private ProductionConfigurationValidator validator(boolean ai, boolean email, String secret, String issuer,
      String origin, String geminiKey, String smtpUser) {
    return validator(ai, email, secret, issuer, origin, geminiKey, smtpUser, "jdbc:postgresql://db/southrail");
  }

  private ProductionConfigurationValidator validator(boolean ai, boolean email, String secret, String issuer,
      String origin, String geminiKey, String smtpUser, String databaseUrl) {
    SouthRailSecurityProperties security = new SouthRailSecurityProperties();
    security.setSecret(secret);
    security.setIssuer(issuer);
    security.setAccessTokenMinutes(20);
    security.setRefreshTokenDays(14);
    SouthRailCorsProperties cors = new SouthRailCorsProperties();
    cors.setAllowedOrigins(Collections.singletonList(origin));
    SouthRailFeatureProperties features = new SouthRailFeatureProperties();
    features.setEmailEnabled(true);
    features.setAiEnabled(ai);
    features.setEmailEnabled(email);
    GeminiConfiguration gemini = new GeminiConfiguration();
    gemini.setApiKey(geminiKey);
    return new ProductionConfigurationValidator(databaseUrl, "db-user", "db-password", smtpUser,
        smtpUser.length() == 0 ? "" : "smtp-password", security, cors, features, gemini);
  }

  private String strongSecret() {
    return "01234567890123456789012345678901";
  }

  private ProductionConfigurationValidator validatorWithDatabaseCredentials(String databaseUsername,
      String databasePassword) {
    SouthRailSecurityProperties security = new SouthRailSecurityProperties();
    security.setSecret(strongSecret());
    security.setIssuer("issuer");
    security.setAccessTokenMinutes(20);
    security.setRefreshTokenDays(14);
    SouthRailCorsProperties cors = new SouthRailCorsProperties();
    cors.setAllowedOrigins(Collections.singletonList("https://app.example"));
    SouthRailFeatureProperties features = new SouthRailFeatureProperties();
    features.setEmailEnabled(true);
    GeminiConfiguration gemini = new GeminiConfiguration();
    return new ProductionConfigurationValidator("jdbc:postgresql://db/southrail", databaseUsername,
        databasePassword, "smtp-user", "smtp-password", security, cors, features, gemini);
  }
}
