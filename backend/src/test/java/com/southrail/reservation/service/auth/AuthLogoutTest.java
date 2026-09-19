package com.southrail.reservation.service.auth;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.southrail.reservation.config.properties.SouthRailSecurityProperties;
import com.southrail.reservation.dto.auth.AuthDtos;
import com.southrail.reservation.entity.account.User;
import com.southrail.reservation.entity.auth.RefreshToken;
import com.southrail.reservation.repository.account.UserRepository;
import com.southrail.reservation.repository.auth.AccountTokenRepository;
import com.southrail.reservation.repository.auth.OAuthLoginCodeRepository;
import com.southrail.reservation.repository.auth.RefreshTokenRepository;
import com.southrail.reservation.security.jwt.JwtService;
import com.southrail.reservation.service.audit.AuditLogService;
import com.southrail.reservation.service.notification.EmailNotificationService;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.crypto.password.PasswordEncoder;

class AuthLogoutTest {
  @Test
  void logoutRevokesThePresentedRefreshToken() {
    RefreshTokenRepository tokens = mock(RefreshTokenRepository.class);
    AuditLogService audit = mock(AuditLogService.class);
    RefreshToken token = new RefreshToken();
    User user = new User();
    user.setId(UUID.randomUUID());
    user.setEmail("passenger@example.com");
    token.setUser(user);
    when(tokens.findActiveByTokenHashForUpdate(anyString())).thenReturn(Optional.of(token));

    service(tokens, audit).logout(new AuthDtos.LogoutRequest("raw-refresh-token"));

    verify(tokens).save(token);
    verify(audit).log(user.getId(), user.getEmail(), "USER_LOGOUT", "AUTH",
        "User signed out and revoked the current refresh token");
    org.assertj.core.api.Assertions.assertThat(token.isRevoked()).isTrue();
  }

  @Test
  void logoutDoesNotRevealAnUnknownRefreshToken() {
    RefreshTokenRepository tokens = mock(RefreshTokenRepository.class);
    AuditLogService audit = mock(AuditLogService.class);
    when(tokens.findActiveByTokenHashForUpdate(anyString())).thenReturn(Optional.empty());

    service(tokens, audit).logout(new AuthDtos.LogoutRequest("unknown-refresh-token"));

    verify(tokens, never()).save(org.mockito.ArgumentMatchers.any());
    verify(audit, never()).log(org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any(),
        org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any());
  }

  private AuthService service(RefreshTokenRepository tokens, AuditLogService audit) {
    SouthRailSecurityProperties security = new SouthRailSecurityProperties();
    security.setRefreshTokenDays(14);
    return new AuthService(
        mock(UserRepository.class), tokens, mock(AccountTokenRepository.class),
        mock(PasswordEncoder.class), mock(AuthenticationManager.class), mock(JwtService.class),
        mock(OAuthLoginCodeRepository.class), mock(EmailNotificationService.class), security, audit);
  }
}
