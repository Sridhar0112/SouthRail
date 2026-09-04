package com.southrail.reservation.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.FutureOrPresent;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

public final class BookingDtos {
  private BookingDtos() {}

  @Getter
  @Setter
  @NoArgsConstructor
  @AllArgsConstructor
  public static class PassengerRequest {
    @NotBlank
    @Size(max = 100)
    private String fullName;

    @Min(1)
    @Max(125)
    private int age;

    @NotBlank
    @Pattern(regexp = "(?i)male|female|other", message = "gender must be male, female, or other")
    private String gender;

    @Size(max = 20)
    private String berthPreference;
  }

  @Getter
  @Setter
  @NoArgsConstructor
  @AllArgsConstructor
  public static class BookingRequest {
    @NotBlank
    @Size(max = 36)
    private String trainId;

    @NotBlank
    @Pattern(regexp = "[A-Za-z0-9]{2,10}", message = "source station code is invalid")
    private String sourceStationCode;

    @NotBlank
    @Pattern(regexp = "[A-Za-z0-9]{2,10}", message = "destination station code is invalid")
    private String destinationStationCode;

    @FutureOrPresent
    @NotNull
    private LocalDate journeyDate;

    @NotBlank
    @Pattern(regexp = "(?i)1A|2A|3A|CC|SL|2S", message = "travel class is invalid")
    private String travelClass;

    @NotBlank
    @Size(max = 20)
    private String quota;

    @NotEmpty
    @Size(max = 6, message = "A booking can contain at most 6 passengers")
    private List<@Valid PassengerRequest> passengers;
  }

  @Getter
  @Setter
  @NoArgsConstructor
  @AllArgsConstructor
  public static class BookingResponse {
    private String bookingId;
    private String pnr;
    private String status;
    private String trainNumber;
    private String trainName;
    private String sourceCode;
    private String sourceName;
    private String destinationCode;
    private String destinationName;
    private LocalDate journeyDate;
    private String travelClass;
    private int passengerCount;
    private BigDecimal totalFare;
    private String paymentStatus;
    private String reservationLabel;
    private Integer queuePosition;
  }

  @Getter
  @Setter
  @NoArgsConstructor
  @AllArgsConstructor
  public static class FareLine {
    private String label;
    private BigDecimal amount;
  }

  @Getter
  @Setter
  @NoArgsConstructor
  @AllArgsConstructor
  public static class BerthSuggestion {
    private String passengerName;
    private String suggestion;
    private String reason;
  }

  @Getter
  @Setter
  @NoArgsConstructor
  @AllArgsConstructor
  public static class BookingReview {
    private BigDecimal baseFare;
    private BigDecimal reservationCharge;
    private BigDecimal convenienceFee;
    private BigDecimal gst;
    private BigDecimal totalFare;
    private int availableSeats;
    private String availabilityStatus;
    private List<FareLine> fareBreakdown;
    private List<BerthSuggestion> berthSuggestions;
    private List<String> cancellationPolicy;
  }

  @Getter
  @Setter
  @NoArgsConstructor
  @AllArgsConstructor
  public static class BookingHistoryItem {
    private String id;
    private String pnr;
    private String trainId;
    private String trainNumber;
    private String trainName;
    private String sourceCode;
    private String sourceName;
    private String destinationCode;
    private String destinationName;
    private LocalDate journeyDate;
    private String status;
    private BigDecimal totalFare;
    private String reservationLabel;
    private Integer queuePosition;
  }

  @Getter
  @Setter
  @NoArgsConstructor
  @AllArgsConstructor
  public static class PnrStatus {
    private String pnr;
    private String trainNumber;
    private String trainName;
    private String sourceCode;
    private String sourceName;
    private String destinationCode;
    private String destinationName;
    private LocalDate journeyDate;
    private String travelClass;
    private String quota;
    private String status;
    private List<String> passengerStatuses;
    private BigDecimal refundAmount;
    private BigDecimal totalFare;
    private String reservationLabel;
    private Integer queuePosition;
  }
}
