package com.southrail.reservation.security.service;

import com.southrail.reservation.entity.account.User;
import com.southrail.reservation.repository.account.UserRepository;
import java.util.Optional;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Supplies the active account lookup required by authentication infrastructure. */
@Service
public class AuthenticationAccountLookupService {
  private final UserRepository users;

  public AuthenticationAccountLookupService(UserRepository users) {
    this.users = users;
  }

  @Transactional(readOnly = true)
  public Optional<User> findEnabledAccount(String email) {
    return users.findByEmailIgnoreCase(email)
        .filter(user -> user.isEnabled() && !user.isDeleted());
  }
}
