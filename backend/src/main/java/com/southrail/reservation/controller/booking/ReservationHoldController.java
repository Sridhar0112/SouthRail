package com.southrail.reservation.controller.booking;

import com.southrail.reservation.dto.booking.BookingDtos;
import com.southrail.reservation.dto.booking.ReservationHoldDtos;
import com.southrail.reservation.service.booking.ReservationHoldService;
import jakarta.validation.Valid;
import java.security.Principal;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/reservation-holds")
public class ReservationHoldController {
  private final ReservationHoldService holds;
  public ReservationHoldController(ReservationHoldService holds) { this.holds = holds; }
  @PostMapping
  ResponseEntity<ReservationHoldDtos.HoldResponse> create(Principal principal,
      @RequestHeader("Idempotency-Key") String key, @Valid @RequestBody BookingDtos.BookingRequest request) {
    return ResponseEntity.status(HttpStatus.CREATED).body(holds.create(principal.getName(), key, request));
  }
  @GetMapping("/{id}")
  ReservationHoldDtos.HoldResponse get(Principal principal, @PathVariable UUID id) {
    return holds.get(principal.getName(), id);
  }
}
