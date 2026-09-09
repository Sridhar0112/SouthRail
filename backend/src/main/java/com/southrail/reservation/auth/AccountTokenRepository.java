package com.southrail.reservation.auth;

import com.southrail.reservation.auth.AccountToken;
import com.southrail.reservation.account.User;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.Lock;
import jakarta.persistence.LockModeType;
import org.springframework.data.repository.query.Param;

public interface AccountTokenRepository extends JpaRepository<AccountToken, UUID> {
  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("select t from AccountToken t where t.tokenHash = :tokenHash and t.tokenType = :tokenType and t.usedAt is null")
  Optional<AccountToken> findOpenByHashAndTypeForUpdate(
      @Param("tokenHash") String tokenHash, @Param("tokenType") String tokenType);
  Optional<AccountToken>
  findTopByUserAndTokenTypeOrderByCreatedAtDesc(
          User user,
          String tokenType
  );
  @Modifying
  @Query("update AccountToken t\n" +
                "set t.usedAt = :usedAt\n" +
                "where t.user = :user\n" +
                "  and t.tokenType = :tokenType\n" +
                "  and t.usedAt is null\n")
  void markOpenTokensUsed(@Param("user") User user, @Param("tokenType") String tokenType, @Param("usedAt") Instant usedAt);
}
