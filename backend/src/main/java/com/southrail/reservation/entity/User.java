package com.southrail.reservation.entity;

import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "app_users")
public class User extends BaseEntity {
  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  private UUID id;


  @Column(nullable = false, unique = true, length = 120)
  private String email;

  @Column(nullable = false, length = 120)
  private String fullName;

  @Column(nullable = false)
  private String passwordHash;

  @Column(length = 15)
  private String phone;

  @Column(nullable = false)
  private boolean emailVerified;

  @Column(nullable = false)
  private boolean enabled = true;

  @ElementCollection(fetch = FetchType.EAGER)
  @CollectionTable(name = "user_roles", joinColumns = @JoinColumn(name = "user_id"))
  @Enumerated(EnumType.STRING)
  @Column(name = "role_name", nullable = false)
  private Set<RoleName> roles = new HashSet<>();

  @Column(nullable = false)
  private Integer failedLoginAttempts = 0;

  @Column
  private java.time.Instant accountLockedUntil;
  private boolean deleted;

  private Instant deletedAt;
}
