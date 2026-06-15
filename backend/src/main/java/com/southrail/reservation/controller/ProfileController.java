package com.southrail.reservation.controller;

import com.southrail.reservation.dto.ProfileDtos;
import com.southrail.reservation.service.ProfileService;
import jakarta.validation.Valid;
import java.security.Principal;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/users/me")
public class ProfileController {
  private final ProfileService profileService;

  public ProfileController(ProfileService profileService) {
    this.profileService = profileService;
  }

  @GetMapping
  ProfileDtos.ProfileResponse get(Principal principal) {
    return profileService.get(principal.getName());
  }

  @PutMapping
  ProfileDtos.ProfileResponse update(Principal principal, @Valid @RequestBody ProfileDtos.ProfileUpdateRequest request) {
    return profileService.update(principal.getName(), request);
  }
  @DeleteMapping
  public ResponseEntity<Void> deleteAccount(
          Principal principal,
          @Valid @RequestBody ProfileDtos.DeleteAccountRequest request) {

    profileService.deleteAccount(
            principal.getName(),
            request.getPassword());

    return ResponseEntity.noContent().build();
  }
  @PutMapping("/password")
  public ResponseEntity<Void> changePassword(
          Principal principal,
          @Valid @RequestBody ProfileDtos.ChangePasswordRequest request) {

    profileService.changePassword(
            principal.getName(),
            request);

    return ResponseEntity.noContent().build();
  }
}
