package com.southrail.reservation.repository;

import com.southrail.reservation.entity.AccountToken;
import com.southrail.reservation.entity.User;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface AccountTokenRepository extends JpaRepository<AccountToken, UUID> {
  Optional<AccountToken> findByTokenHashAndTokenTypeAndUsedAtIsNull(String tokenHash, String tokenType);
  Optional<AccountToken>
  findTopByUserAndTokenTypeOrderByCreatedAtDesc(
          User user,
          String tokenType
  );
  @Modifying
  @Query("""
      update AccountToken t
      set t.usedAt = :usedAt
      where t.user = :user
        and t.tokenType = :tokenType
        and t.usedAt is null
      """)
  void markOpenTokensUsed(@Param("user") User user, @Param("tokenType") String tokenType, @Param("usedAt") Instant usedAt);
}
