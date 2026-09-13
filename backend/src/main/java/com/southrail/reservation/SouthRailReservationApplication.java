package com.southrail.reservation;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;
import org.springframework.scheduling.annotation.EnableScheduling;

@EnableCaching
@SpringBootApplication
@ConfigurationPropertiesScan
@EnableScheduling
public class SouthRailReservationApplication {
  public static void main(String[] args) {
    SpringApplication.run(SouthRailReservationApplication.class, args);
  }
}
