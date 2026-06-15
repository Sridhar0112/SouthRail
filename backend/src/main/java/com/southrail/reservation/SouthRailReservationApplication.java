package com.southrail.reservation;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cache.annotation.EnableCaching;

@EnableCaching
@SpringBootApplication
public class SouthRailReservationApplication {
  public static void main(String[] args) {
    SpringApplication.run(SouthRailReservationApplication.class, args);
  }
}
