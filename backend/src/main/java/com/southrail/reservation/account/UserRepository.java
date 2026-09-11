package com.southrail.reservation.account;

import com.southrail.reservation.account.User;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import jakarta.persistence.LockModeType;

public interface UserRepository extends JpaRepository<User, UUID> {
  Optional<User> findByEmailIgnoreCase(String email);
  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("select u from User u where lower(u.email) = lower(:email)")
  Optional<User> findByEmailIgnoreCaseForUpdate(@Param("email") String email);
  boolean existsByEmailIgnoreCase(String email);
}
