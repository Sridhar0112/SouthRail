package com.southrail.reservation.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.Set;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

public final class ProfileDtos {
  private ProfileDtos() {}

  @Getter
  @Setter
  @NoArgsConstructor
  @AllArgsConstructor
  public static class ProfileResponse {
    private String id;
    private String fullName;
    private String email;
    private String phone;
    private boolean emailVerified;
    private Set<String> roles;
  }

  @Getter
  @Setter
  @NoArgsConstructor
  @AllArgsConstructor
  public static class ProfileUpdateRequest {
    @NotBlank
    @Size(min = 2, max = 120)
    private String fullName;

    @Size(max = 15)
    private String phone;
  }
  @Getter
  @Setter
  @NoArgsConstructor
  @AllArgsConstructor
  public static class DeleteAccountRequest {

    @NotBlank(message = "Password is required")
    private String password;
  }
  @Getter
  @Setter
  @NoArgsConstructor
  @AllArgsConstructor
  public static class ChangePasswordRequest {

    @NotBlank(message = "Current password is required")
    private String currentPassword;

    @NotBlank(message = "New password is required")
    @Size(min = 8, max = 128, message = "Password must be between 8 and 128 characters")
    private String newPassword;
  }
}
