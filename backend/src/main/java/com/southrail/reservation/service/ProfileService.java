package com.southrail.reservation.service;

import com.southrail.reservation.dto.ProfileDtos;
import com.southrail.reservation.entity.User;
import com.southrail.reservation.exception.ApiException;
import com.southrail.reservation.repository.RefreshTokenRepository;
import com.southrail.reservation.repository.UserRepository;
import jakarta.validation.constraints.NotBlank;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

@Service
public class ProfileService {
  private final UserRepository users;
  private final PasswordEncoder passwordEncoder;
  private final RefreshTokenRepository refreshTokens;
  private final AuditLogService auditLogService;

  public ProfileService(UserRepository users,PasswordEncoder passwordEncoder,RefreshTokenRepository refreshTokenRepository,AuditLogService auditLogService) {
    this.users = users;
    this.passwordEncoder=passwordEncoder;
    this.refreshTokens=refreshTokenRepository;
    this.auditLogService=auditLogService;
  }

  @Transactional(readOnly = true)
  public ProfileDtos.ProfileResponse get(String email) {
    return toResponse(findUser(email));
  }

  @Transactional
  public ProfileDtos.ProfileResponse update(String email, ProfileDtos.ProfileUpdateRequest request) {
    User user = findUser(email);
    user.setFullName(request.getFullName());
    user.setPhone(request.getPhone());
    auditLogService.log(
            user.getId(),
            user.getEmail(),
            "PROFILE_UPDATED",
            "PROFILE",
            "Profile updated successfully"
    );
    return toResponse(user);
  }

  private User findUser(String email) {
    User user = users.findByEmailIgnoreCase(email)
            .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "User not found"));

    if (user.isDeleted()) {
      throw new ApiException(HttpStatus.FORBIDDEN, "This account has been deleted");
    }

    return user;
  }

  private ProfileDtos.ProfileResponse toResponse(User user) {
    return new ProfileDtos.ProfileResponse(
        user.getId().toString(),
        user.getFullName(),
        user.getEmail(),
        user.getPhone(),
        user.isEmailVerified(),
        user.getRoles().stream().map(Enum::name).collect(java.util.stream.Collectors.toSet()));
  }
  @Transactional
  public void deleteAccount(String email, @NotBlank(message = "Password is required") String password) {
    User user = findUser(email);

    if (!passwordEncoder.matches(password, user.getPasswordHash())) {
      throw new ApiException(
              HttpStatus.BAD_REQUEST,
              "Invalid password");
    }

    user.setEnabled(false);
    user.setDeleted(true);
    user.setDeletedAt(Instant.now());
    refreshTokens.revokeActiveTokens(user);
    auditLogService.log(
            user.getId(),
            user.getEmail(),
            "ACCOUNT_DELETED",
            "ACCOUNT",
            "User account deleted"
    );
  }
  @Transactional
  public void changePassword(
          String email,
          ProfileDtos.ChangePasswordRequest request) {

    User user = findUser(email);

    if (!passwordEncoder.matches(
            request.getCurrentPassword(),
            user.getPasswordHash())) {

      throw new ApiException(
              HttpStatus.BAD_REQUEST,
              "Current password is incorrect");
    }

    if (passwordEncoder.matches(
            request.getNewPassword(),
            user.getPasswordHash())) {

      throw new ApiException(
              HttpStatus.BAD_REQUEST,
              "New password must be different from current password");
    }

    user.setPasswordHash(
            passwordEncoder.encode(
                    request.getNewPassword()));
    auditLogService.log(
            user.getId(),
            user.getEmail(),
            "PASSWORD_CHANGED",
            "ACCOUNT",
            "Password changed successfully"
    );

    refreshTokens.revokeActiveTokens(user);
  }
}
