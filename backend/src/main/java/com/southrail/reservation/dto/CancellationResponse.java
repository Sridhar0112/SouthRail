package com.southrail.reservation.dto;

import java.math.BigDecimal;
import java.time.Instant;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class CancellationResponse {
  private String pnr;
  private String status;
  private BigDecimal refundAmount;
  private BigDecimal cancellationCharge;
  private BigDecimal refundPercentage;
  private BigDecimal totalFare;
  private String message;
  private Instant cancelledAt;
}
