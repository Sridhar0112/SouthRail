package com.southrail.reservation.payment;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

@SpringBootTest(properties = {
    "spring.flyway.enabled=true",
    "spring.jpa.hibernate.ddl-auto=validate"
})
@ActiveProfiles("test")
@Testcontainers(disabledWithoutDocker = true)
class PaymentFlywayIntegrationTest {
  @Container
  static final PostgreSQLContainer<?> POSTGRES =
      new PostgreSQLContainer<>("postgres:16-alpine");

  @DynamicPropertySource
  static void postgresProperties(DynamicPropertyRegistry registry) {
    registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
    registry.add("spring.datasource.username", POSTGRES::getUsername);
    registry.add("spring.datasource.password", POSTGRES::getPassword);
    registry.add("spring.datasource.driver-class-name", () -> "org.postgresql.Driver");
  }

  @Autowired
  private JdbcTemplate jdbc;

  @Test
  void migratesFreshDatabaseThroughPaymentLifecycle() {
    Integer version = jdbc.queryForObject(
        "select max(cast(version as integer)) from flyway_schema_history where success",
        Integer.class);
    assertThat(version).isEqualTo(11);

    List<String> tables = jdbc.queryForList(
        "select table_name from information_schema.tables "
            + "where table_schema = 'public' and table_name like 'payment%'",
        String.class);
    assertThat(tables).contains("payments", "payment_refunds", "payment_webhook_events");

    List<String> indexes = jdbc.queryForList(
        "select indexname from pg_indexes where schemaname = 'public'",
        String.class);
    assertThat(indexes).contains(
        "uq_payments_order",
        "uq_payments_provider_payment",
        "uq_payments_idempotency",
        "uq_payments_one_successful_booking",
        "uq_refunds_provider_id",
        "uq_refunds_idempotency");
  }
}
