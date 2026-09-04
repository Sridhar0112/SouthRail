package com.southrail.reservation.config;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Test;

class ProductionConfigurationValidatorTest {
  @Test
  void acceptsCompleteProductionSecurityAndMailSettings() {
    ProductionConfigurationValidator validator = new ProductionConfigurationValidator(
        "mailer", "mail-password", "01234567890123456789012345678901");

    assertThatCode(validator::validate).doesNotThrowAnyException();
  }

  @Test
  void rejectsBlankMailCredentials() {
    ProductionConfigurationValidator validator = new ProductionConfigurationValidator(
        " ", "mail-password", "01234567890123456789012345678901");

    assertThatThrownBy(validator::validate)
        .isInstanceOf(IllegalStateException.class)
        .hasMessage("MAIL_USERNAME must be configured for the prod profile");
  }

  @Test
  void rejectsWeakJwtSecret() {
    ProductionConfigurationValidator validator = new ProductionConfigurationValidator(
        "mailer", "mail-password", "too-short");

    assertThatThrownBy(validator::validate)
        .isInstanceOf(IllegalStateException.class)
        .hasMessage("JWT_SECRET must contain at least 32 bytes for the prod profile");
  }
}
