package com.southrail.reservation.controller;


import com.southrail.reservation.dto.SupportDtos;
import com.southrail.reservation.service.SupportTicketService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

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
}

