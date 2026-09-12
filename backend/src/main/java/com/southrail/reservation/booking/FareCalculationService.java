package com.southrail.reservation.booking;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Locale;
import org.springframework.stereotype.Service;

@Service
public class FareCalculationService {
  private static final BigDecimal RESERVATION_CHARGE = BigDecimal.valueOf(40);
  private static final BigDecimal CONVENIENCE_FEE = BigDecimal.valueOf(24);
  private static final BigDecimal GST_RATE = BigDecimal.valueOf(0.05);

  public Fare quote(int distanceKm, String travelClass, int passengerCount) {
    BigDecimal passengers = BigDecimal.valueOf(passengerCount);
    BigDecimal baseFare = BigDecimal.valueOf(Math.max(1, distanceKm))
        .multiply(classRate(travelClass))
        .multiply(passengers)
        .setScale(2, RoundingMode.HALF_UP);
    BigDecimal reservationCharge = RESERVATION_CHARGE.multiply(passengers).setScale(2);
    BigDecimal convenienceFee = CONVENIENCE_FEE.setScale(2);
    BigDecimal gst = baseFare.multiply(GST_RATE).setScale(2, RoundingMode.HALF_UP);
    return new Fare(baseFare, reservationCharge, convenienceFee, gst,
        baseFare.add(reservationCharge).add(convenienceFee).add(gst));
  }

  private BigDecimal classRate(String travelClass) {
    return switch (travelClass.toUpperCase(Locale.ROOT)) {
      case "1A" -> BigDecimal.valueOf(4.20);
      case "2A" -> BigDecimal.valueOf(2.80);
      case "3A" -> BigDecimal.valueOf(2.00);
      case "CC" -> BigDecimal.valueOf(1.70);
      case "SL" -> BigDecimal.valueOf(0.75);
      default -> BigDecimal.valueOf(0.45);
    };
  }

  public record Fare(BigDecimal baseFare, BigDecimal reservationCharge,
      BigDecimal convenienceFee, BigDecimal gst, BigDecimal total) {}
}
