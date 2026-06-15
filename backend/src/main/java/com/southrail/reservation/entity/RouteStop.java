package com.southrail.reservation.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.LocalTime;
import java.util.UUID;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "route_stops")
public class RouteStop extends BaseEntity {
  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  private UUID id;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "train_id")
  private Train train;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "station_id")
  private Station station;

  @Column(nullable = false)
  private int stopOrder;

  private LocalTime arrivalTime;
  private LocalTime departureTime;
  private int dayOffset;
  private int distanceKm;
  private String platform;
}
