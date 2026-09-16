package com.southrail.reservation.service.auth;
import com.southrail.reservation.service.auth.*;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.mockito.Mockito.*;
import com.southrail.reservation.entity.account.*;
import com.southrail.reservation.repository.account.*;
import com.southrail.reservation.repository.auth.*;
import com.southrail.reservation.service.audit.AuditLogService;
import com.southrail.reservation.dto.auth.AuthDtos;
import com.southrail.reservation.service.notification.EmailNotificationService;
import com.southrail.reservation.config.properties.SouthRailSecurityProperties;
import com.southrail.reservation.security.jwt.JwtService;
import java.time.Instant;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.crypto.password.PasswordEncoder;
class AuthPublicDisclosureTest {
 @Test void recoveryEndpointsReturnSuccessForUnknownAndIneligibleAccounts() {
  UserRepository users=mock(UserRepository.class); AuthService service=service(users);
  when(users.findByEmailIgnoreCaseForUpdate("unknown@example.com")).thenReturn(Optional.empty());
  when(users.findByEmailIgnoreCaseForUpdate("verified@example.com")).thenReturn(Optional.of(user(true,false,true,null)));
  when(users.findByEmailIgnoreCaseForUpdate("deleted@example.com")).thenReturn(Optional.of(user(false,true,true,null)));
  when(users.findByEmailIgnoreCaseForUpdate("unlocked@example.com")).thenReturn(Optional.of(user(false,false,true,null)));
  assertThatCode(()->service.forgotPassword(new AuthDtos.ForgotPasswordRequest("unknown@example.com"))).doesNotThrowAnyException();
  assertThatCode(()->service.forgotPassword(new AuthDtos.ForgotPasswordRequest("deleted@example.com"))).doesNotThrowAnyException();
  assertThatCode(()->service.resendVerificationEmail(new AuthDtos.ResendVerificationRequest("unknown@example.com"))).doesNotThrowAnyException();
  assertThatCode(()->service.resendVerificationEmail(new AuthDtos.ResendVerificationRequest("verified@example.com"))).doesNotThrowAnyException();
  assertThatCode(()->service.sendUnlockEmail(new AuthDtos.SendUnlockEmailRequest("unknown@example.com"))).doesNotThrowAnyException();
  assertThatCode(()->service.sendUnlockEmail(new AuthDtos.SendUnlockEmailRequest("unlocked@example.com"))).doesNotThrowAnyException();
 }
 private AuthService service(UserRepository users){ SouthRailSecurityProperties s=new SouthRailSecurityProperties(); s.setRefreshTokenDays(14); return new AuthService(users,mock(RefreshTokenRepository.class),mock(AccountTokenRepository.class),mock(PasswordEncoder.class),mock(AuthenticationManager.class),mock(JwtService.class),mock(OAuthLoginCodeRepository.class),mock(EmailNotificationService.class),s,mock(AuditLogService.class)); }
 private User user(boolean verified,boolean deleted,boolean enabled,Instant lock){User u=new User();u.setEmailVerified(verified);u.setDeleted(deleted);u.setEnabled(enabled);u.setAccountLockedUntil(lock);return u;}
}
