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
import java.util.UUID;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "passengers")
public class Passenger extends BaseEntity {
  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  private UUID id;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "booking_id")
  private Booking booking;

  @Column(nullable = false, length = 100)
  private String fullName;

  @Column(nullable = false)
  private int age;

  @Column(nullable = false, length = 20)
  private String gender;

  @Column(length = 20)
  private String berthPreference;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false)
  private BookingStatus status;
}
