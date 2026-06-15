package com.southrail.reservation.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.Set;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

public final class AuthDtos {
  private AuthDtos() {}

  @Getter
  @Setter
  @NoArgsConstructor
  @AllArgsConstructor
  public static class RegisterRequest {
    @NotBlank
    @Size(min = 2, max = 120)
    private String fullName;

    @Email
    @NotBlank
    private String email;

    @NotBlank
    @Size(min = 8, max = 72)
    private String password;

    @Size(max = 15)
    private String phone;
  }

  @Getter
  @Setter
  @NoArgsConstructor
  @AllArgsConstructor
  public static class LoginRequest {
    @Email
    @NotBlank
    private String email;

    @NotBlank
    private String password;
  }

  @Getter
  @Setter
  @NoArgsConstructor
  @AllArgsConstructor
  public static class RefreshRequest {
    @NotBlank
    private String refreshToken;
  }

  @Getter
  @Setter
  @NoArgsConstructor
  @AllArgsConstructor
  public static class ForgotPasswordRequest {
    @Email
    @NotBlank
    private String email;
  }

  @Getter
  @Setter
  @NoArgsConstructor
  @AllArgsConstructor
  public static class ResetPasswordRequest {
    @NotBlank
    private String token;

    @NotBlank
    @Size(min = 8, max = 72)
    private String password;
  }

  @Getter
  @Setter
  @NoArgsConstructor
  @AllArgsConstructor
  public static class VerifyEmailRequest {
    @NotBlank
    private String token;
  }

  @Getter
  @Setter
  @NoArgsConstructor
  @AllArgsConstructor
  public static class AuthResponse {
    private String accessToken;
    private String refreshToken;
    private String tokenType;
    private UserSummary user;
  }

  @Getter
  @Setter
  @NoArgsConstructor
  @AllArgsConstructor
  public static class UserSummary {
    private String id;
    private String fullName;
    private String email;
    private Set<String> roles;
  }
  public static class RegisterResponse {
    private String message;
    private String email;
    private boolean emailVerificationRequired;

    public RegisterResponse() {
    }

    public RegisterResponse(String message, String email, boolean emailVerificationRequired) {
      this.message = message;
      this.email = email;
      this.emailVerificationRequired = emailVerificationRequired;
    }

    public String getMessage() {
      return message;
    }

    public void setMessage(String message) {
      this.message = message;
    }

    public String getEmail() {
      return email;
    }

    public void setEmail(String email) {
      this.email = email;
    }

    public boolean isEmailVerificationRequired() {
      return emailVerificationRequired;
    }

    public void setEmailVerificationRequired(boolean emailVerificationRequired) {
      this.emailVerificationRequired = emailVerificationRequired;
    }
  }
  @Getter
  @Setter
  @NoArgsConstructor
  @AllArgsConstructor
  public static class ResendVerificationRequest {

    @Email
    @NotBlank
    private String email;
  }
    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SendUnlockEmailRequest {

        @Email
        @NotBlank
        private String email;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UnlockAccountRequest {

        @NotBlank
        private String token;
    }

}
