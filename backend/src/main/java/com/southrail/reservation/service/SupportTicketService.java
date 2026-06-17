package com.southrail.reservation.service;

import com.southrail.reservation.dto.SupportDtos;
import com.southrail.reservation.entity.SupportTicket;
import com.southrail.reservation.entity.User;
import com.southrail.reservation.repository.SupportTicketRepository;
import com.southrail.reservation.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class SupportTicketService {

    private final SupportTicketRepository repository;
    private final UserRepository userRepository;

    public SupportTicket createTicket(
            SupportDtos.SupportTicketRequest request) {

        SupportTicket ticket = new SupportTicket();

        Authentication authentication =
                SecurityContextHolder
                        .getContext()
                        .getAuthentication();

        String email = authentication.getName();

        User user = userRepository
                .findByEmailIgnoreCase(email)
                .orElseThrow(() ->
                        new RuntimeException("User not found"));
        ticket.setFullName(user.getFullName());
        ticket.setEmail(user.getEmail());

        ticket.setBookingReference(request.getBookingReference());
        ticket.setTopic(request.getTopic());
        ticket.setDescription(request.getDescription());

        ticket.setStatus("OPEN");
        ticket.setCreatedAt(LocalDateTime.now());

        return repository.save(ticket);
    }
}
