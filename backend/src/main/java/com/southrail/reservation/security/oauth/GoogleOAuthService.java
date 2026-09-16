package com.southrail.reservation.security.oauth;

import com.southrail.reservation.entity.account.RoleName;
import com.southrail.reservation.entity.account.User;
import com.southrail.reservation.entity.auth.OAuthLoginCode;
import com.southrail.reservation.exception.ApiException;
import com.southrail.reservation.repository.account.UserRepository;
import com.southrail.reservation.repository.auth.OAuthLoginCodeRepository;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.HexFormat;
import java.util.Locale;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.oauth2.core.oidc.user.OidcUser;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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
      throw new ApiException(HttpStatus.FORBIDDEN, "Google email is not verified");
    }
    String subject = identity.getSubject();
    String email = identity.getEmail() == null ? "" : identity.getEmail().trim().toLowerCase(Locale.ROOT);
    if (subject == null || subject.isBlank() || email.isBlank()) {
      throw new ApiException(HttpStatus.UNAUTHORIZED, "Google identity is incomplete");
    }
    User user = users.findByAuthProviderAndProviderSubject("GOOGLE", subject).orElse(null);
    if (user == null) {
      if (users.existsByEmailIgnoreCase(email)) {
        throw new ApiException(HttpStatus.CONFLICT,
            "This email is already registered. Please sign in using your existing login method.");
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
      throw new ApiException(HttpStatus.FORBIDDEN, "Account is disabled");
    }
    String raw = UUID.randomUUID() + "." + UUID.randomUUID();
    OAuthLoginCode code = new OAuthLoginCode();
    code.setUser(user);
    code.setCodeHash(hash(raw));
    code.setExpiresAt(Instant.now().plusSeconds(90));
    codes.save(code);
    return raw;
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
