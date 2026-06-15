package com.southrail.reservation.dto;

import java.math.BigDecimal;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class RefundQuoteDto {
  private BigDecimal totalFare;
  private BigDecimal refundAmount;
  private BigDecimal cancellationCharge;
  private BigDecimal refundPercentage;
  private String policyMessage;
}
