package com.southrail.reservation.security.oauth;

import com.southrail.reservation.entity.account.RoleName;
import com.southrail.reservation.entity.account.User;
import com.southrail.reservation.entity.auth.OAuthLoginCode;
import com.southrail.reservation.repository.account.UserRepository;
import com.southrail.reservation.repository.auth.OAuthLoginCodeRepository;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.HexFormat;
import java.util.Locale;
import java.util.UUID;
import org.springframework.security.oauth2.core.oidc.user.OidcUser;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.scheduling.annotation.Scheduled;

@Service
public class GoogleOAuthService {
  private final UserRepository users;
  private final OAuthLoginCodeRepository codes;

  public GoogleOAuthService(UserRepository users, OAuthLoginCodeRepository codes) {
    this.users = users;
    this.codes = codes;
  }

  @Transactional
  public String createExchangeCode(OidcUser identity) {
    if (!Boolean.TRUE.equals(identity.getEmailVerified())) {
      throw new OAuthLoginException(OAuthLoginException.Reason.EMAIL_NOT_VERIFIED);
    }
    String subject = identity.getSubject();
    String email = identity.getEmail() == null ? "" : identity.getEmail().trim().toLowerCase(Locale.ROOT);
    if (subject == null || subject.isBlank() || email.isBlank()) {
      throw new OAuthLoginException(OAuthLoginException.Reason.AUTHENTICATION_FAILED);
    }
    User user = users.findByAuthProviderAndProviderSubject("GOOGLE", subject).orElse(null);
    if (user == null) {
      if (users.existsByEmailIgnoreCase(email)) {
        throw new OAuthLoginException(OAuthLoginException.Reason.ACCOUNT_CONFLICT);
      }
      user = new User();
      user.setEmail(email);
      String name = identity.getFullName();
      user.setFullName(name == null || name.isBlank() ? email : name);
      user.setEmailVerified(true);
      user.setEnabled(true);
      user.setAuthProvider("GOOGLE");
      user.setProviderSubject(subject);
      user.getRoles().add(RoleName.ROLE_USER);
      user = users.saveAndFlush(user);
    }
    if (user.isDeleted() || !user.isEnabled()) {
      throw new OAuthLoginException(OAuthLoginException.Reason.ACCOUNT_DISABLED);
    }
    String raw = UUID.randomUUID() + "." + UUID.randomUUID();
    OAuthLoginCode code = new OAuthLoginCode();
    code.setUser(user);
    code.setCodeHash(hash(raw));
    code.setExpiresAt(Instant.now().plusSeconds(90));
    codes.save(code);
    return raw;
  }

  @Scheduled(cron = "${app.oauth.cleanup-cron:0 17 3 * * *}")
  @Transactional
  public void deleteExpiredExchangeCodes() {
    codes.deleteExpiredBefore(Instant.now().minusSeconds(86_400));
  }

  private String hash(String value) {
    try {
      return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
          .digest(value.getBytes(StandardCharsets.UTF_8)));
    } catch (Exception ex) {
      throw new IllegalStateException(ex);
    }
  }
}
