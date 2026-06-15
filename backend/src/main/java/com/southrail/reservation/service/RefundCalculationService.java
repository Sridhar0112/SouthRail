package com.southrail.reservation.service;

import com.southrail.reservation.dto.RefundQuoteDto;
import com.southrail.reservation.entity.Booking;
import com.southrail.reservation.entity.RouteStop;
import com.southrail.reservation.repository.RouteStopRepository;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.time.LocalDateTime;
import org.springframework.stereotype.Service;

@Service
public class RefundCalculationService {
  private final RouteStopRepository routeStops;

  public RefundCalculationService(RouteStopRepository routeStops) {
    this.routeStops = routeStops;
  }

  public RefundQuoteDto calculate(Booking booking) {
    BigDecimal refundPercentage = refundPercentage(resolveJourneyDateTime(booking));
    BigDecimal totalFare = booking.getTotalFare().setScale(2, RoundingMode.HALF_UP);
    BigDecimal refundAmount = totalFare
        .multiply(refundPercentage)
        .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
    BigDecimal cancellationCharge = totalFare.subtract(refundAmount).setScale(2, RoundingMode.HALF_UP);

    return new RefundQuoteDto(
        totalFare,
        refundAmount,
        cancellationCharge,
        refundPercentage.setScale(2, RoundingMode.HALF_UP),
        policyMessage(refundPercentage));
  }

  private LocalDateTime resolveJourneyDateTime(Booking booking) {
    return routeStops.findFirstByTrainAndStationOrderByStopOrderAsc(booking.getTrain(), booking.getSourceStation())
        .filter(stop -> stop.getDepartureTime() != null)
        .map(stop -> booking.getJourneyDate().plusDays(stop.getDayOffset()).atTime(stop.getDepartureTime()))
        // Bookings store journeyDate but not a captured departure timestamp, so fall back to start of journey day.
        .orElse(booking.getJourneyDate().atStartOfDay());
  }

  private BigDecimal refundPercentage(LocalDateTime journeyDateTime) {
    Duration timeUntilJourney = Duration.between(LocalDateTime.now(), journeyDateTime);

    if (timeUntilJourney.compareTo(Duration.ofHours(48)) > 0) {
      return BigDecimal.valueOf(90);
    }
    if (timeUntilJourney.compareTo(Duration.ofHours(24)) >= 0) {
      return BigDecimal.valueOf(75);
    }
    if (timeUntilJourney.compareTo(Duration.ofHours(4)) >= 0) {
      return BigDecimal.valueOf(50);
    }
    return BigDecimal.valueOf(0);
  }

  private String policyMessage(BigDecimal refundPercentage) {
    if (refundPercentage.compareTo(BigDecimal.valueOf(90)) == 0) {
      return "More than 48 hours before journey: 90% refund.";
    }
    if (refundPercentage.compareTo(BigDecimal.valueOf(75)) == 0) {
      return "24 to 48 hours before journey: 75% refund.";
    }
    if (refundPercentage.compareTo(BigDecimal.valueOf(50)) == 0) {
      return "4 to 24 hours before journey: 50% refund.";
    }
    return "Less than 4 hours before journey: no refund is applicable.";
  }
}
