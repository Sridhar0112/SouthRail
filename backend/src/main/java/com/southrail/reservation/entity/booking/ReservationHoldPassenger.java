package com.southrail.reservation.entity.booking;

import com.southrail.reservation.entity.common.BaseEntity;
import jakarta.persistence.*;
import java.util.UUID;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "reservation_hold_passengers")
public class ReservationHoldPassenger extends BaseEntity {
  @Id @GeneratedValue(strategy = GenerationType.UUID) private UUID id;
  @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "hold_id")
  private ReservationHold hold;
  @Column(name = "passenger_order", nullable = false) private int passengerOrder;
  @Column(name = "full_name", nullable = false, length = 100) private String fullName;
  @Column(nullable = false) private int age;
  @Column(nullable = false, length = 20) private String gender;
  @Column(name = "berth_preference", length = 20) private String berthPreference;
}
