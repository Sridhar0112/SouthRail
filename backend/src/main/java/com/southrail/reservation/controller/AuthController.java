package com.southrail.reservation.controller;

import com.southrail.reservation.dto.AuthDtos;
import com.southrail.reservation.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/auth")
public class AuthController {
  private final AuthService authService;

  public AuthController(AuthService authService) {
    this.authService = authService;
  }

  @PostMapping("/register")
  ResponseEntity<AuthDtos.RegisterResponse> register(@Valid @RequestBody AuthDtos.RegisterRequest request) {
    return ResponseEntity.status(HttpStatus.CREATED).body(authService.register(request));
  }

  @PostMapping("/login")
  AuthDtos.AuthResponse login(@Valid @RequestBody AuthDtos.LoginRequest request) {
    return authService.login(request);
  }

  @PostMapping("/refresh")
  AuthDtos.AuthResponse refresh(@Valid @RequestBody AuthDtos.RefreshRequest request) {
    return authService.refresh(request);
  }
  @PostMapping("/resend-verification")
  ResponseEntity<Void> resendVerification(
          @Valid @RequestBody AuthDtos.ResendVerificationRequest request) {

    authService.resendVerificationEmail(request);

    return ResponseEntity.accepted().build();
  }
  @PostMapping("/forgot-password")
  ResponseEntity<Void> forgotPassword(@Valid @RequestBody AuthDtos.ForgotPasswordRequest request) {
    authService.forgotPassword(request);
    return ResponseEntity.accepted().build();
  }

  @PostMapping("/reset-password")
  ResponseEntity<Void> resetPassword(@Valid @RequestBody AuthDtos.ResetPasswordRequest request) {
    authService.resetPassword(request);
    return ResponseEntity.noContent().build();
  }

  @PostMapping("/verify-email")
  ResponseEntity<Void> verifyEmail(@Valid @RequestBody AuthDtos.VerifyEmailRequest request) {
    authService.verifyEmail(request);
    return ResponseEntity.noContent().build();
  }
    @PostMapping("/send-unlock-email")
    ResponseEntity<Void> sendUnlockEmail(
            @Valid @RequestBody AuthDtos.SendUnlockEmailRequest request) {

        authService.sendUnlockEmail(request);

        return ResponseEntity.accepted().build();
    }

    @PostMapping("/unlock-account")
    ResponseEntity<Void> unlockAccount(
            @Valid @RequestBody AuthDtos.UnlockAccountRequest request) {

        authService.unlockAccount(request);

        return ResponseEntity.noContent().build();
    }

}
