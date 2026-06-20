package com.southrail.reservation.service;

import com.southrail.reservation.dto.AuthDtos;
import com.southrail.reservation.entity.AccountToken;
import com.southrail.reservation.entity.RefreshToken;
import com.southrail.reservation.entity.RoleName;
import com.southrail.reservation.entity.User;
import com.southrail.reservation.exception.ApiException;
import com.southrail.reservation.repository.AccountTokenRepository;
import com.southrail.reservation.repository.RefreshTokenRepository;
import com.southrail.reservation.repository.UserRepository;
import com.southrail.reservation.security.JwtService;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Duration;
import java.time.Instant;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {
  private static final Logger log = LoggerFactory.getLogger(AuthService.class);
  private static final String RESET_PASSWORD = "RESET_PASSWORD";
  private static final String VERIFY_EMAIL = "VERIFY_EMAIL";
  private static final String UNLOCK_ACCOUNT = "UNLOCK_ACCOUNT";

  private final UserRepository users;
  private final RefreshTokenRepository refreshTokens;
  private final AccountTokenRepository accountTokens;
  private final PasswordEncoder passwordEncoder;
  private final AuthenticationManager authenticationManager;
  private final JwtService jwtService;
  private final AccountEmailService accountEmailService;
  private final long refreshDays;
  private final AuditLogService auditLogService;

  public AuthService(UserRepository users, RefreshTokenRepository refreshTokens, AccountTokenRepository accountTokens,
                     PasswordEncoder passwordEncoder, AuthenticationManager authenticationManager, JwtService jwtService,
                     AccountEmailService accountEmailService,
                     @Value("${app.jwt.refresh-token-days}") long refreshDays,AuditLogService auditLogService) {
    this.users = users;
    this.refreshTokens = refreshTokens;
    this.accountTokens = accountTokens;
    this.passwordEncoder = passwordEncoder;
    this.authenticationManager = authenticationManager;
    this.jwtService = jwtService;
    this.accountEmailService = accountEmailService;
    this.refreshDays = refreshDays;
    this.auditLogService=auditLogService;
  }

  @Transactional
  public AuthDtos.RegisterResponse register(AuthDtos.RegisterRequest request) {
    User existingUser = users.findByEmailIgnoreCase(
                    request.getEmail().trim().toLowerCase())
            .orElse(null);

    if (existingUser != null) {

      if (!existingUser.isDeleted()) {
        throw new ApiException(
                HttpStatus.CONFLICT,
                "Email is already registered");
      }

      restoreDeletedAccount(existingUser, request);

      return new AuthDtos.RegisterResponse(
              "Account restored successfully. Please verify your email before logging in.",
              existingUser.getEmail(),
              true);
    }
    User user = new User();
    user.setFullName(request.getFullName());
    user.setEmail(request.getEmail().toLowerCase());
    user.setPhone(request.getPhone());
    user.setEmailVerified(false);
    user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
    user.getRoles().add(RoleName.ROLE_USER);
    users.save(user);

    String verificationToken = createAccountToken(user, VERIFY_EMAIL, Duration.ofDays(2));
    trySendVerification(user, verificationToken);

    return new AuthDtos.RegisterResponse(
            "Account created successfully. Please verify your email before logging in.",
            user.getEmail(),
            true);
  }
  private void restoreDeletedAccount(
          User user,
          AuthDtos.RegisterRequest request) {

    user.setDeleted(false);
    user.setDeletedAt(null);
    user.setEnabled(true);
    refreshTokens.revokeActiveTokens(user);
    user.setEmailVerified(false);

    user.setFailedLoginAttempts(0);
    user.setAccountLockedUntil(null);

    user.setFullName(request.getFullName());
    user.setPhone(request.getPhone());

    user.setPasswordHash(
            passwordEncoder.encode(request.getPassword()));

    String verificationToken =
            createAccountToken(
                    user,
                    VERIFY_EMAIL,
                    Duration.ofDays(2));

    trySendVerification(user, verificationToken);
  }
  public AuthDtos.AuthResponse login(AuthDtos.LoginRequest request) {

        User user = users.findByEmailIgnoreCase(request.getEmail())
                .orElseThrow(() ->
                        new ApiException(
                                HttpStatus.UNAUTHORIZED,
                                "Invalid email or password"));
    // Account deleted scenario
    if (user.isDeleted()) {
      throw new ApiException(
              HttpStatus.FORBIDDEN,
              "This account has been deleted");
    }
    if (!user.isEnabled()) {
      throw new ApiException(
              HttpStatus.FORBIDDEN,
              "Account is disabled");
    }
        // Check account lock before authentication
        if (user.getAccountLockedUntil() != null &&
                user.getAccountLockedUntil().isAfter(Instant.now())) {

            throw new ApiException(
                    HttpStatus.LOCKED,
                    "Account is temporarily locked. Use the unlock option or try again after 15 minutes.",user.getAccountLockedUntil());
        }

        try {

            authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(
                            request.getEmail(),
                            request.getPassword()));

        } catch (AuthenticationException ex) {

            user.setFailedLoginAttempts(
                    user.getFailedLoginAttempts() + 1);

            if (user.getFailedLoginAttempts() >= 5) {

                user.setAccountLockedUntil(
                        Instant.now().plus(Duration.ofMinutes(15)));

                users.save(user);

                throw new ApiException(
                        HttpStatus.LOCKED,
                        "Account locked due to multiple failed login attempts.");
            }

            users.save(user);

            throw new ApiException(
                    HttpStatus.UNAUTHORIZED,
                    "Invalid email or password");
        }

        if (!user.isEmailVerified()) {
            throw new ApiException(
                    HttpStatus.FORBIDDEN,
                    "Please verify your email before logging in.");
        }

        // Reset failed attempts after successful login
        user.setFailedLoginAttempts(0);
        user.setAccountLockedUntil(null);

        users.save(user);
    auditLogService.log(
            user.getId(),
            user.getEmail(),
            "USER_LOGIN",
            "AUTH",
            "User logged in successfully"
    );

        return issueTokens(user);
    }

  @Transactional
  public AuthDtos.AuthResponse refresh(AuthDtos.RefreshRequest request) {
    RefreshToken token = refreshTokens.findByTokenHashAndRevokedFalse(hash(request.getRefreshToken()))
            .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "Refresh token is invalid"));
    User user= token.getUser();
    if(user.isDeleted()){
      throw new ApiException(HttpStatus.FORBIDDEN,"This account has been deleted");
    }
    if (token.getExpiresAt().isBefore(Instant.now())) {
      token.setRevoked(true);
      refreshTokens.save(token);
      throw new ApiException(HttpStatus.UNAUTHORIZED, "Refresh token expired");
    }
    token.setRevoked(true);
    refreshTokens.save(token);
    return issueTokens(user);
  }

  @Transactional
  public void forgotPassword(AuthDtos.ForgotPasswordRequest request) {
    users.findByEmailIgnoreCase(request.getEmail()).ifPresent(user -> {
      if (user.isDeleted()) {
        throw new ApiException(
                HttpStatus.FORBIDDEN,
                "Account has been deleted");
      }
      String resetToken = createAccountToken(user, RESET_PASSWORD, Duration.ofMinutes(30));
      trySendPasswordReset(user, resetToken);
    });
  }

  @Transactional
  public void resetPassword(AuthDtos.ResetPasswordRequest request) {
    AccountToken token = consumeAccountToken(request.getToken(), RESET_PASSWORD);
      User user = token.getUser();

      user.setPasswordHash(
              passwordEncoder.encode(
                      request.getPassword()));
      user.setFailedLoginAttempts(0);
      user.setAccountLockedUntil(null);
    auditLogService.log(
            user.getId(),
            user.getEmail(),
            "PASSWORD_CHANGED",
            "ACCOUNT",
            "Password changed successfully"
    );
    refreshTokens.revokeActiveTokens(token.getUser());

  }

  @Transactional
  public void verifyEmail(AuthDtos.VerifyEmailRequest request) {
    AccountToken token = consumeAccountToken(request.getToken(), VERIFY_EMAIL);
    token.getUser().setEmailVerified(true);
  }

  private String createAccountToken(User user, String tokenType, Duration ttl) {
    accountTokens.markOpenTokensUsed(user, tokenType, Instant.now());
    String rawToken = UUID.randomUUID() + "." + UUID.randomUUID();
    AccountToken token = new AccountToken();
    token.setUser(user);
    token.setTokenType(tokenType);
    token.setTokenHash(hash(rawToken));
    token.setExpiresAt(Instant.now().plus(ttl));
    accountTokens.save(token);
    return rawToken;
  }

  private AccountToken consumeAccountToken(String rawToken, String tokenType) {
    AccountToken token = accountTokens.findByTokenHashAndTokenTypeAndUsedAtIsNull(hash(rawToken), tokenType)
            .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "Token is invalid or already used"));
    if (token.getExpiresAt().isBefore(Instant.now())) {
      token.setUsedAt(Instant.now());
      throw new ApiException(HttpStatus.BAD_REQUEST, "Token expired");
    }
    token.setUsedAt(Instant.now());
    return token;
  }

  private void trySendPasswordReset(User user, String token) {
    try {
      accountEmailService.sendPasswordReset(user, token);
    } catch (RuntimeException ex) {
      log.warn("Password reset email could not be sent to {}", user.getEmail(), ex);
    }
  }

  private void trySendVerification(User user, String token) {
    try {
      accountEmailService.sendEmailVerification(user, token);
    } catch (RuntimeException ex) {
      log.warn("Email verification message could not be sent to {}", user.getEmail(), ex);
    }
  }

  private AuthDtos.AuthResponse issueTokens(User user) {
    String refresh = UUID.randomUUID() + "." + UUID.randomUUID();
    RefreshToken refreshToken = new RefreshToken();
    refreshToken.setUser(user);
    refreshToken.setTokenHash(hash(refresh));
    refreshToken.setExpiresAt(Instant.now().plusSeconds(refreshDays * 24 * 60 * 60));
    refreshTokens.save(refreshToken);
    return new AuthDtos.AuthResponse(jwtService.createAccessToken(user), refresh, "Bearer", toSummary(user));
  }

  private AuthDtos.UserSummary toSummary(User user) {
    return new AuthDtos.UserSummary(
            user.getId().toString(),
            user.getFullName(),
            user.getEmail(),
            user.getRoles().stream().map(Enum::name).collect(java.util.stream.Collectors.toSet()));
  }

  private String hash(String raw) {
    try {
      return toHex(MessageDigest.getInstance("SHA-256").digest(raw.getBytes(StandardCharsets.UTF_8)));
    } catch (Exception ex) {
      throw new IllegalStateException(ex);
    }
  }

  private String toHex(byte[] bytes) {
    StringBuilder builder = new StringBuilder(bytes.length * 2);
    for (byte item : bytes) {
      builder.append(String.format("%02x", item & 0xff));
    }
    return builder.toString();
  }
  @Transactional
  public void resendVerificationEmail(AuthDtos.ResendVerificationRequest request) {

    User user = users.findByEmailIgnoreCase(request.getEmail())
            .orElseThrow(() ->
                    new ApiException(
                            HttpStatus.NOT_FOUND,
                            "Email address is not registered"));
    if (user.isDeleted()) {
      throw new ApiException(
              HttpStatus.FORBIDDEN,
              "Account has been deleted");
    }
    if (user.isEmailVerified()) {
      throw new ApiException(
              HttpStatus.BAD_REQUEST,
              "Email is already verified");
    }

    AccountToken latestToken =
            accountTokens
                    .findTopByUserAndTokenTypeOrderByCreatedAtDesc(
                            user,
                            VERIFY_EMAIL)
                    .orElse(null);

    if (latestToken != null &&
            latestToken.getCreatedAt().isAfter(
                    Instant.now().minusSeconds(300))) {

      throw new ApiException(
              HttpStatus.TOO_MANY_REQUESTS,
              "Please wait 5 minutes before requesting another verification email.");
    }

    String verificationToken =
            createAccountToken(
                    user,
                    VERIFY_EMAIL,
                    Duration.ofDays(2));

    trySendVerification(user, verificationToken);
  }
    private void trySendUnlockEmail(User user, String token) {

        try {
            accountEmailService.sendAccountUnlock(user, token);
        } catch (RuntimeException ex) {
            log.warn(
                    "Unlock email could not be sent to {}",
                    user.getEmail(),
                    ex);
        }
    }
    @Transactional
    public void sendUnlockEmail(
            AuthDtos.SendUnlockEmailRequest request) {

        User user = users.findByEmailIgnoreCase(
                        request.getEmail())
                .orElseThrow(() ->
                        new ApiException(
                                HttpStatus.NOT_FOUND,
                                "User not found"));
      if (user.isDeleted()) {
        throw new ApiException(
                HttpStatus.FORBIDDEN,
                "Account has been deleted");
      }
      AccountToken latestToken =
              accountTokens
                      .findTopByUserAndTokenTypeOrderByCreatedAtDesc(
                              user,
                              UNLOCK_ACCOUNT)
                      .orElse(null);
      if (latestToken != null &&
              latestToken.getCreatedAt().isAfter(
                      Instant.now().minusSeconds(300))) {

        throw new ApiException(
                HttpStatus.TOO_MANY_REQUESTS,
                "Please wait 5 minutes before requesting another unlock email.");
      }

        if (user.getAccountLockedUntil() == null ||
                user.getAccountLockedUntil().isBefore(Instant.now())) {

            throw new ApiException(
                    HttpStatus.BAD_REQUEST,
                    "Account is not locked");
        }

        String token =
                createAccountToken(
                        user,
                        UNLOCK_ACCOUNT,
                        Duration.ofMinutes(30));

        trySendUnlockEmail(user, token);
    }
    @Transactional
    public void unlockAccount(
            AuthDtos.UnlockAccountRequest request) {

        AccountToken token =
                consumeAccountToken(
                        request.getToken(),
                        UNLOCK_ACCOUNT);

        User user = token.getUser();

        user.setFailedLoginAttempts(0);
        user.setAccountLockedUntil(null);
      users.save(user);

      auditLogService.log(
              user.getId(),
              user.getEmail(),
              "ACCOUNT_UNLOCKED",
              "SECURITY",
              "Account unlocked successfully"
      );
    }
}
