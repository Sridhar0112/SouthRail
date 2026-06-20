package com.southrail.reservation.controller;


import com.southrail.reservation.dto.SupportDtos;
import com.southrail.reservation.entity.SupportTicket;
import com.southrail.reservation.service.SupportTicketService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/support")
@RequiredArgsConstructor
public class SupportController {

    private final SupportTicketService service;
    @PostMapping("/tickets")
    public ResponseEntity<?> createTicket(
            @Valid @RequestBody SupportDtos.SupportTicketRequest request){
            return ResponseEntity.ok(
                    service.createTicket(request)
            );
        }
    @GetMapping("/my-tickets")
    public ResponseEntity<?> getMyTickets() {
        return ResponseEntity.ok(
                service.getMyTickets()
        );
    }

    @GetMapping("/my-tickets/{ticketId}")
    public ResponseEntity<?> getMyTicket(
            @PathVariable UUID ticketId) {

        return ResponseEntity.ok(
                service.getMyTicket(ticketId)
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
            @PathVariable UUID ticketId) {

        return ResponseEntity.ok(
                service.getUserMessages(ticketId)
        );
    }

    @PostMapping("/my-tickets/{ticketId}/messages")
    public ResponseEntity<?> addMyTicketMessage(
            @PathVariable UUID ticketId,
            @Valid @RequestBody SupportDtos.TicketMessageRequest request) {

        return ResponseEntity.ok(
                service.addUserMessage(ticketId, request)
        );
    }

    @GetMapping("/admin/tickets/{ticketId}/messages")
    public ResponseEntity<?> getAdminTicketMessages(
            @PathVariable UUID ticketId) {

        return ResponseEntity.ok(
                service.getAdminMessages(ticketId)
        );
    }

    @PostMapping("/admin/tickets/{ticketId}/messages")
    public ResponseEntity<?> addAdminTicketMessage(
            @PathVariable UUID ticketId,
            @Valid @RequestBody SupportDtos.TicketMessageRequest request) {

        return ResponseEntity.ok(
                service.addAdminMessage(ticketId, request)
        );
    }
}

