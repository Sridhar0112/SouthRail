package com.southrail.reservation.controller;

import com.southrail.reservation.dto.BookingDtos;
import com.southrail.reservation.dto.CancellationResponse;
import com.southrail.reservation.dto.CancellationReviewResponse;
import com.southrail.reservation.dto.NotificationDtos;
import com.southrail.reservation.service.BookingCancellationService;
import com.southrail.reservation.service.BookingService;
import com.southrail.reservation.service.NotificationService;
import com.southrail.reservation.service.TicketPdfService;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import jakarta.validation.Valid;
import java.security.Principal;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping
public class BookingController {
  private final BookingService bookingService;
  private final BookingCancellationService bookingCancellationService;
  private final NotificationService notificationService;
  private final TicketPdfService ticketPdfService;

  public BookingController(BookingService bookingService, BookingCancellationService bookingCancellationService, NotificationService notificationService, TicketPdfService ticketPdfService) {
    this.bookingService = bookingService;
    this.bookingCancellationService = bookingCancellationService;
    this.notificationService = notificationService;
    this.ticketPdfService = ticketPdfService;
  }

  @PostMapping("/bookings")
  ResponseEntity<BookingDtos.BookingResponse> create(
          Principal principal,
          @Valid @RequestBody BookingDtos.BookingRequest request) {

    return ResponseEntity
            .status(HttpStatus.CREATED)
            .body(bookingService.create(principal.getName(), request));
  }

  @PostMapping("/bookings/review")
  BookingDtos.BookingReview review(@Valid @RequestBody BookingDtos.BookingRequest request) {
    return bookingService.review(request);
  }

  @GetMapping("/bookings")
  Page<BookingDtos.BookingHistoryItem> history(Principal principal, Pageable pageable) {
    return bookingService.history(principal.getName(), pageable);
  }

  @GetMapping("/bookings/{pnr}/cancellation-review")
  CancellationReviewResponse cancellationReview(Principal principal, @PathVariable String pnr) {
    return bookingCancellationService.review(principal.getName(), pnr);
  }

  @PostMapping("/bookings/{pnr}/cancel")
  CancellationResponse cancelBooking(Principal principal, @PathVariable String pnr) {
    return bookingCancellationService.cancel(principal.getName(), pnr);
  }

  @GetMapping("/notifications")
  java.util.List<NotificationDtos.NotificationView> notifications(Principal principal, Pageable pageable) {
    return notificationService.list(principal.getName(), pageable);
  }

  @GetMapping("/pnr/{pnr}")
  BookingDtos.PnrStatus pnr(@PathVariable String pnr) {
    return bookingService.pnr(pnr);
  }

  @PostMapping("/pnr/{pnr}/cancel")
  CancellationResponse cancelByPnr(Principal principal, @PathVariable String pnr) {
    return bookingCancellationService.cancel(principal.getName(), pnr);
  }
  @GetMapping("/bookings/{pnr}/ticket")
  ResponseEntity<byte[]> downloadTicket(
          Principal principal,
          @PathVariable String pnr) {

    byte[] pdf = ticketPdfService.generateTicket(
            principal.getName(),
            pnr);

    return ResponseEntity.ok()
            .header(
                    HttpHeaders.CONTENT_DISPOSITION,
                    "attachment; filename=\"SouthRail-Ticket-" + pnr + ".pdf\"")
            .contentType(MediaType.APPLICATION_PDF)
            .body(pdf);
  }
}
