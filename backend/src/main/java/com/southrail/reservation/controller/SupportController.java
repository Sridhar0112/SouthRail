package com.southrail.reservation.controller;


import com.southrail.reservation.dto.SupportDtos;
import com.southrail.reservation.service.SupportTicketService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.RequestBody;

@RestController
@RequestMapping("/support")
@RequiredArgsConstructor
public class SupportController {

    private final SupportTicketService service;
    @PostMapping("/tickets")
        public ResponseEntity<?> createTicket(
                @RequestBody SupportDtos.SupportTicketRequest request) {

            return ResponseEntity.ok(
                    service.createTicket(request)
            );
        }
}

