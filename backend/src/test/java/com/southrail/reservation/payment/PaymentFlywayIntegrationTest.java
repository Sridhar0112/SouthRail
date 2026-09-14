package com.southrail.reservation.payment;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

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

    String activePaymentConstraint = jdbc.queryForObject(
        "select indexdef from pg_indexes where schemaname = 'public' "
            + "and indexname = 'uq_payments_one_successful_booking'",
        String.class);
    assertThat(activePaymentConstraint)
        .contains("CREATED", "PENDING", "AUTHORIZED");
  }

  @Test
  void databasePreventsConcurrentPayableAttemptsForOneBooking() {
    String userId = "90000000-0000-4000-9000-000000000001";
    String bookingId = "90000000-0000-4000-9000-000000000002";
    jdbc.update(
        "insert into app_users (id,email,full_name,password_hash,email_verified,enabled,"
            + "created_at,updated_at) values (?::uuid,?,?,?,?,?,now(),now())",
        userId, "payment-test@southrail.invalid", "Payment Test", "hash", true, true);
    jdbc.update(
        "insert into bookings (id,pnr,user_id,train_id,source_station_id,"
            + "destination_station_id,journey_date,travel_class,quota,status,total_fare,"
            + "created_at,updated_at) values (?::uuid,?,?::uuid,?::uuid,?::uuid,?::uuid,"
            + "current_date + 1,'3A','GENERAL','CONFIRMED',1000.00,now(),now())",
        bookingId,
        "9000000001",
        userId,
        "8ddad0c4-0000-4000-9000-000000000001",
        "20000000-0000-4000-9000-000000000002",
        "20000000-0000-4000-9000-000000000001");
    jdbc.update(
        "insert into payments (id,booking_id,provider,amount,currency,status,idempotency_key,"
            + "created_at,updated_at) values (?::uuid,?::uuid,'RAZORPAY',1000.00,'INR',"
            + "'CREATED','key-one',now(),now())",
        "90000000-0000-4000-9000-000000000003", bookingId);

    assertThatThrownBy(() -> jdbc.update(
        "insert into payments (id,booking_id,provider,amount,currency,status,idempotency_key,"
            + "created_at,updated_at) values (?::uuid,?::uuid,'RAZORPAY',1000.00,'INR',"
            + "'PENDING','key-two',now(),now())",
        "90000000-0000-4000-9000-000000000004", bookingId))
        .isInstanceOf(org.springframework.dao.DataIntegrityViolationException.class);
  }
}
