package com.southrail.reservation.account;

import com.southrail.reservation.account.User;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserRepository extends JpaRepository<User, UUID> {
  Optional<User> findByEmailIgnoreCase(String email);
  boolean existsByEmailIgnoreCase(String email);
}
