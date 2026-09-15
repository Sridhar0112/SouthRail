package com.southrail.reservation.entity.booking;

import com.southrail.reservation.entity.account.User;
import com.southrail.reservation.entity.common.BaseEntity;
import com.southrail.reservation.entity.train.Station;
import com.southrail.reservation.entity.train.Train;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;
import java.util.ArrayList;
import java.util.List;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "reservation_holds")
public class ReservationHold extends BaseEntity {
  @Id @GeneratedValue(strategy = GenerationType.UUID)
  private UUID id;
  @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "user_id")
  private User user;
  @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "train_id")
  private Train train;
  @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "source_station_id")
  private Station sourceStation;
  @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "destination_station_id")
  private Station destinationStation;
  @Column(nullable = false) private LocalDate journeyDate;
  @Column(nullable = false, length = 5) private String travelClass;
  @Column(nullable = false, length = 20) private String quota;
  @Column(nullable = false, precision = 10, scale = 2) private BigDecimal totalFare;
  @Enumerated(EnumType.STRING) @Column(nullable = false, length = 20)
  private ReservationHoldStatus status;
  @Enumerated(EnumType.STRING) @Column(name = "provisional_status", nullable = false, length = 20)
  private BookingStatus provisionalStatus;
  @Column(name = "reservation_label", nullable = false, length = 30)
  private String reservationLabel;
  @Column(name = "expires_at", nullable = false) private Instant expiresAt;
  @Column(name = "idempotency_key", nullable = false, length = 128) private String idempotencyKey;
  @Column(name = "request_fingerprint", nullable = false, length = 64) private String requestFingerprint;
  @OneToOne(fetch = FetchType.LAZY) @JoinColumn(name = "booking_id") private Booking booking;
  @OneToMany(mappedBy = "hold", cascade = CascadeType.ALL, orphanRemoval = true)
  @OrderBy("passengerOrder asc")
  private List<ReservationHoldPassenger> passengers = new ArrayList<>();
}
