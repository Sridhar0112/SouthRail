package com.southrail.reservation.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class CancellationReviewResponse {
  private String pnr;
  private String trainNumber;
  private String trainName;
  private String sourceCode;
  private String destinationCode;
  private LocalDate journeyDate;
  private String travelClass;
  private String bookingStatus;
  private BigDecimal totalFare;
  private BigDecimal cancellationCharge;
  private BigDecimal refundAmount;
  private BigDecimal refundPercentage;
  private boolean cancellable;
  private String message;
}
