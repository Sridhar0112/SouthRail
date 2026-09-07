package com.southrail.reservation.account;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

class AuthenticationAccountLookupServiceTest {
  @Test
  void returnsOnlyEnabledAndNonDeletedAccounts() {
    UserRepository users = Mockito.mock(UserRepository.class);
    AuthenticationAccountLookupService service = new AuthenticationAccountLookupService(users);
    User active = new User();
    active.setEnabled(true);
    active.setDeleted(false);
    User disabled = new User();
    disabled.setEnabled(false);
    disabled.setDeleted(false);
    when(users.findByEmailIgnoreCase("active@example.com")).thenReturn(Optional.of(active));
    when(users.findByEmailIgnoreCase("disabled@example.com")).thenReturn(Optional.of(disabled));

    assertThat(service.findEnabledAccount("active@example.com")).containsSame(active);
    assertThat(service.findEnabledAccount("disabled@example.com")).isEmpty();
  }
}
