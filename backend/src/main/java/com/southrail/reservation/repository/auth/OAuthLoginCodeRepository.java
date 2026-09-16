package com.southrail.reservation.repository.auth;

import com.southrail.reservation.entity.auth.OAuthLoginCode;
import jakarta.persistence.LockModeType;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;

public interface OAuthLoginCodeRepository extends JpaRepository<OAuthLoginCode, UUID> {
  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("select c from OAuthLoginCode c join fetch c.user where c.codeHash = :hash and c.usedAt is null")
  Optional<OAuthLoginCode> findOpenForUpdate(@Param("hash") String hash);
}
