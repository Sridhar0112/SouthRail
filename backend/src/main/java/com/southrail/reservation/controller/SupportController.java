package com.southrail.reservation.controller;


import com.southrail.reservation.dto.SupportDtos;
import com.southrail.reservation.entity.SupportTicket;
import com.southrail.reservation.service.SupportTicketService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.security.Principal;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/support")
@RequiredArgsConstructor
public class SupportController {

    private final SupportTicketService service;
    @PostMapping("/tickets")
    public ResponseEntity<?> createTicket(
            Principal principal,
            @Valid @RequestBody SupportDtos.SupportTicketRequest request) {

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(service.createTicket(request, principal.getName()));
    }
    @GetMapping("/my-tickets")
    public ResponseEntity<?> getMyTickets(Principal principal) {
        return ResponseEntity.ok(
                service.getMyTickets(principal.getName())
        );
    }

    @GetMapping("/my-tickets/{ticketId}")
    public ResponseEntity<?> getMyTicket(
            Principal principal,
            @PathVariable UUID ticketId) {

        return ResponseEntity.ok(
                service.getMyTicket(principal.getName(), ticketId)
        );
    }
    @GetMapping("/admin/tickets")
    public ResponseEntity<List<SupportTicket>> getAllTickets() {
        return ResponseEntity.ok(
                service.getAllTickets()
        );
    }
    @PutMapping("/admin/tickets/{ticketId}/status")
    public ResponseEntity<?> updateTicketStatus(
            @PathVariable UUID ticketId,
            @Valid @RequestBody SupportDtos.UpdateTicketStatusRequest request) {

        return ResponseEntity.ok(
                service.updateTicketStatus(ticketId, request)
        );
    }
    @GetMapping("/my-tickets/{ticketId}/messages")
    public ResponseEntity<?> getMyTicketMessages(
            Principal principal,
            @PathVariable UUID ticketId) {

        return ResponseEntity.ok(
                service.getUserMessages(principal.getName(), ticketId)
        );
    }

    @PostMapping("/my-tickets/{ticketId}/messages")
    public ResponseEntity<?> addMyTicketMessage(
            Principal principal,
            @PathVariable UUID ticketId,
            @Valid @RequestBody SupportDtos.TicketMessageRequest request) {

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(service.addUserMessage(principal.getName(), ticketId, request));
    }

    @GetMapping("/admin/tickets/{ticketId}/messages")
    public ResponseEntity<?> getAdminTicketMessages(
            @PathVariable UUID ticketId) {

        return ResponseEntity.ok(
                service.getAdminMessages(ticketId)
        );
    }

    @PostMapping("/admin/tickets/{ticketId}/messages")
    public ResponseEntity<?> addAdminTicketMessage(Principal principal,
            @PathVariable UUID ticketId,
            @Valid @RequestBody SupportDtos.TicketMessageRequest request) {

        return ResponseEntity.ok(
                service.addAdminMessage(principal.getName(),ticketId, request)
        );
    }
}

