package com.southrail.reservation.shared.validation;

import static org.assertj.core.api.Assertions.assertThat;

import com.southrail.reservation.ai.dto.AIDtos;
import com.southrail.reservation.booking.dto.BookingDtos;

import jakarta.validation.Validation;
import jakarta.validation.Validator;
import java.time.LocalDate;
import java.util.Arrays;
import java.util.Collections;
import org.junit.jupiter.api.Test;

class FoundationValidationTest {
  private final Validator validator = Validation.buildDefaultValidatorFactory().getValidator();

  @Test
  void preservesFrontendCompatibilityForLargerBookingParty() {
    BookingDtos.PassengerRequest passenger = new BookingDtos.PassengerRequest("Passenger", 30, "other", null);
    BookingDtos.BookingRequest request = new BookingDtos.BookingRequest(
        "8ddad0c4-0000-4000-9000-000000000001", "MAS", "SBC", LocalDate.now(), "3A", "GENERAL",
        Arrays.asList(passenger, passenger, passenger, passenger, passenger, passenger, passenger));

    assertThat(validator.validate(request)).isEmpty();
  }

  @Test
  void rejectsBlankAiMessage() {
    AIDtos.ChatRequest request = new AIDtos.ChatRequest(" ", null, Double.valueOf(0.7), Integer.valueOf(100));

    assertThat(validator.validate(request)).anyMatch(violation ->
        "message".equals(violation.getPropertyPath().toString()));
  }

  @Test
  void acceptsRepresentativeBookingRequest() {
    BookingDtos.PassengerRequest passenger = new BookingDtos.PassengerRequest("Passenger", 30, "female", "LOWER");
    BookingDtos.BookingRequest request = new BookingDtos.BookingRequest(
        "8ddad0c4-0000-4000-9000-000000000001", "MAS", "SBC", LocalDate.now(), "3A", "GENERAL",
        Collections.singletonList(passenger));

    assertThat(validator.validate(request)).isEmpty();
  }
}
