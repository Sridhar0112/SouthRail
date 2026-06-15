package com.southrail.reservation.controller;

import com.southrail.reservation.dto.AdminDtos;
import com.southrail.reservation.service.AdminService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/admin")
@PreAuthorize("hasRole('ADMIN')")
public class AdminController {
  private final AdminService adminService;

  public AdminController(AdminService adminService) {
    this.adminService = adminService;
  }

  @GetMapping("/summary")
  AdminDtos.Summary summary() {
    return adminService.summary();
  }

  @GetMapping("/users")
  Page<AdminDtos.UserRow> users(Pageable pageable) {
    return adminService.users(pageable);
  }

  @GetMapping("/trains")
  Page<AdminDtos.TrainRow> trains(Pageable pageable) {
    return adminService.trains(pageable);
  }

  @GetMapping("/stations")
  Page<AdminDtos.StationRow> stations(Pageable pageable) {
    return adminService.stations(pageable);
  }

  @GetMapping("/routes")
  Page<AdminDtos.RouteRow> routes(Pageable pageable) {
    return adminService.routes(pageable);
  }

  @GetMapping("/bookings")
  Page<AdminDtos.BookingRow> bookings(Pageable pageable) {
    return adminService.bookings(pageable);
  }
}
