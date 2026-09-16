package com.southrail.reservation.entity.auth;

import com.southrail.reservation.entity.account.User;
import com.southrail.reservation.entity.common.BaseEntity;
import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;
import lombok.Getter;
import lombok.Setter;

@Getter @Setter @Entity @Table(name = "oauth_login_codes")
public class OAuthLoginCode extends BaseEntity {
  @Id @GeneratedValue(strategy = GenerationType.UUID)
  private UUID id;
  @ManyToOne(optional = false, fetch = FetchType.LAZY)
  @JoinColumn(name = "user_id", nullable = false)
  private User user;
  @Column(name = "code_hash", nullable = false, unique = true, length = 64)
  private String codeHash;
  @Column(name = "expires_at", nullable = false)
  private Instant expiresAt;
  @Column(name = "used_at")
  private Instant usedAt;
}
