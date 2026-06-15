package com.southrail.reservation.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.util.UUID;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "stations")
public class Station extends BaseEntity {
  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  private UUID id;

  @Column(nullable = false, unique = true, length = 10)
  private String code;

  @Column(nullable = false, length = 120)
  private String name;

  @Column(nullable = false, length = 80)
  private String city;

  @Column(nullable = false, length = 80)
  private String state;

  private Double latitude;
  private Double longitude;
}
