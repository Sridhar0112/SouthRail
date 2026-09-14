package com.southrail.reservation.payment.dto;

import com.southrail.reservation.entity.payment.PaymentStatus;
import jakarta.validation.constraints.NotBlank;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.UUID;

public final class PaymentDtos {
  private PaymentDtos() {}

  public record CreatePaymentOrderResponse(
      UUID paymentId,
      String razorpayOrderId,
      String keyId,
      long amount,
      String currency) {}

  public record VerificationRequest(
      @NotBlank String razorpayOrderId,
      @NotBlank String razorpayPaymentId,
      @NotBlank String razorpaySignature) {}

  public record PaymentStatusResponse(
      UUID paymentId,
      UUID bookingId,
      BigDecimal amount,
      String currency,
      PaymentStatus status,
      String providerOrderId,
      String providerPaymentId) {}

  public record ActivePaymentResponse(
      UUID paymentId,
      String razorpayOrderId,
      String keyId,
      long amount,
      String currency,
      PaymentStatus status) {}

  public record PaymentBookingDetails(
      UUID bookingId,
      String pnr,
      String trainNumber,
      String trainName,
      String sourceCode,
      String destinationCode,
      LocalDate journeyDate,
      LocalTime departureTime,
      LocalTime arrivalTime,
      String travelClass,
      String quota,
      BigDecimal totalFare,
      List<PaymentPassenger> passengers) {}

  public record PaymentPassenger(
      String name, int age, String gender, String seatPreference) {}
}
