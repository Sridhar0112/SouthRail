package com.southrail.reservation.auth;

import com.southrail.reservation.auth.RefreshToken;
import com.southrail.reservation.account.User;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.Lock;
import jakarta.persistence.LockModeType;
import org.springframework.data.repository.query.Param;

public interface RefreshTokenRepository extends JpaRepository<RefreshToken, UUID> {
  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("select t from RefreshToken t where t.tokenHash = :tokenHash and t.revoked = false")
  Optional<RefreshToken> findActiveByTokenHashForUpdate(@Param("tokenHash") String tokenHash);

  @Modifying
  @Query("update RefreshToken t set t.revoked = true where t.user = :user and t.revoked = false")
  void revokeActiveTokens(@Param("user") User user);
}
