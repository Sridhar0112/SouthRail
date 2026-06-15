package com.southrail.reservation.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.LocalDate;
import java.util.UUID;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "booking_seats")
public class BookingSeat extends BaseEntity {
  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  private UUID id;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "booking_id")
  private Booking booking;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "passenger_id")
  private Passenger passenger;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "coach_id")
  private Coach coach;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "train_id")
  private Train train;

  @Column(nullable = false)
  private LocalDate journeyDate;

  @Column(nullable = false, length = 5)
  private String travelClass;

  @Column(nullable = false, length = 10)
  private String coachCode;

  @Column(nullable = false)
  private int seatNumber;

  @Column(length = 20)
  private String berthType;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false)
  private BookingSeatStatus status;
}
