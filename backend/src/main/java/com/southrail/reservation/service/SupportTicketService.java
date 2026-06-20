package com.southrail.reservation.service;

import com.southrail.reservation.dto.SupportDtos;
import com.southrail.reservation.entity.SupportTicket;
import com.southrail.reservation.entity.SupportTicketMessage;
import com.southrail.reservation.entity.User;
import com.southrail.reservation.repository.SupportTicketMessageRepository;
import com.southrail.reservation.repository.SupportTicketRepository;
import com.southrail.reservation.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class SupportTicketService {

    private final SupportTicketRepository repository;
    private final UserRepository userRepository;
    private final SupportTicketMessageRepository messageRepository;

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
                        new IllegalStateException("User not found"));
        ticket.setFullName(user.getFullName());
        ticket.setEmail(user.getEmail());

        ticket.setBookingReference(request.getBookingReference());
        ticket.setTopic(request.getTopic());
        ticket.setDescription(request.getDescription());

        ticket.setStatus("OPEN");
        ticket.setCreatedAt(LocalDateTime.now());

        SupportTicket savedTicket = repository.save(ticket);

        SupportTicketMessage firstMessage = new SupportTicketMessage();
        firstMessage.setTicket(savedTicket);
        firstMessage.setSenderType("USER");
        firstMessage.setSenderName(user.getFullName());
        firstMessage.setSenderEmail(user.getEmail());
        firstMessage.setMessage(request.getDescription());
        firstMessage.setCreatedAt(LocalDateTime.now());

        messageRepository.save(firstMessage);

        return savedTicket;
    }

    public List<SupportTicket> getMyTickets() {

        String email = SecurityContextHolder
                .getContext()
                .getAuthentication()
                .getName();

        return repository.findByEmailOrderByCreatedAtDesc(email);
    }

    public SupportTicket getMyTicket(UUID ticketId) {

        String email = SecurityContextHolder
                .getContext()
                .getAuthentication()
                .getName();

        return repository.findByIdAndEmail(ticketId, email)
                .orElseThrow(() ->
                        new IllegalStateException("Ticket not found"));
    }

    @Transactional(readOnly = true)
    public List<SupportTicket> getAllTickets() {
        return repository.findAll();
    }

    @Transactional
    public SupportTicket updateTicketStatus(
            UUID ticketId,
            SupportDtos.UpdateTicketStatusRequest request) {

        SupportTicket ticket = repository.findById(ticketId)
                .orElseThrow(() ->
                        new IllegalStateException("Ticket not found"));

        String status = request.getStatus();

        if (!List.of("OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED").contains(status)) {
            throw new IllegalArgumentException("Invalid ticket status");
        }

        ticket.setStatus(status);

        return repository.save(ticket);
    }

    @Transactional(readOnly = true)
    public List<SupportDtos.TicketMessageResponse> getAdminMessages(UUID ticketId) {
        return messageRepository
                .findByTicketIdOrderByCreatedAtAsc(ticketId)
                .stream()
                .map(message ->
                        new SupportDtos.TicketMessageResponse(
                                message.getId(),
                                message.getSenderType(),
                                message.getSenderName(),
                                message.getSenderEmail(),
                                message.getMessage(),
                                message.getCreatedAt()
                        )
                )
                .toList();
    }

    @Transactional
    public SupportDtos.TicketMessageResponse addUserMessage(
            UUID ticketId,
            SupportDtos.TicketMessageRequest request) {

        Authentication authentication =
                SecurityContextHolder
                        .getContext()
                        .getAuthentication();

        String email = authentication.getName();

        User user = userRepository
                .findByEmailIgnoreCase(email)
                .orElseThrow(() ->
                        new IllegalStateException("User not found"));

        SupportTicket ticket = getUserTicket(ticketId);
        if ("CLOSED".equals(ticket.getStatus())) {
            throw new IllegalStateException(
                    "Ticket is closed. Messages cannot be added."
            );
        }
        SupportTicketMessage message =
                new SupportTicketMessage();

        message.setTicket(ticket);
        message.setSenderType("USER");
        message.setSenderName(user.getFullName());
        message.setSenderEmail(user.getEmail());
        message.setMessage(request.getMessage());
        message.setCreatedAt(LocalDateTime.now());
        messageRepository.save(message);

        return new SupportDtos.TicketMessageResponse(
                message.getId(),
                message.getSenderType(),
                message.getSenderName(),
                message.getSenderEmail(),
                message.getMessage(),
                message.getCreatedAt()
        );
    }

    @Transactional
    public SupportDtos.TicketMessageResponse addAdminMessage(
            UUID ticketId,
            SupportDtos.TicketMessageRequest request) {

        Authentication authentication =
                SecurityContextHolder
                        .getContext()
                        .getAuthentication();

        String email = authentication.getName();

        User admin = userRepository
                .findByEmailIgnoreCase(email)
                .orElseThrow(() ->
                        new IllegalStateException("Admin not found"));

        SupportTicket ticket =
                repository
                        .findById(ticketId)
                        .orElseThrow(() ->
                                new IllegalStateException("Ticket not found"));

        SupportTicketMessage message =
                new SupportTicketMessage();

        message.setTicket(ticket);
        message.setSenderType("ADMIN");
        message.setSenderName(admin.getFullName());
        message.setSenderEmail(admin.getEmail());
        message.setMessage(request.getMessage());
        message.setCreatedAt(LocalDateTime.now());
        if ("CLOSED".equals(ticket.getStatus())) {
            throw new IllegalStateException(
                    "Ticket is closed. Messages cannot be added."
            );
        }
        if ("OPEN".equals(ticket.getStatus())) {
            ticket.setStatus("IN_PROGRESS");
            repository.save(ticket);
        }

        messageRepository.save(message);

        return new SupportDtos.TicketMessageResponse(
                message.getId(),
                message.getSenderType(),
                message.getSenderName(),
                message.getSenderEmail(),
                message.getMessage(),
                message.getCreatedAt()
        );
    }

    private SupportTicket getUserTicket(UUID ticketId) {

        String email = SecurityContextHolder
                .getContext()
                .getAuthentication()
                .getName();

        return repository
                .findByIdAndEmail(ticketId, email)
                .orElseThrow(() ->
                        new IllegalStateException("Ticket not found"));
    }
    @Transactional(readOnly = true)
    public List<SupportDtos.TicketMessageResponse> getUserMessages(UUID ticketId) {

        getUserTicket(ticketId);

        return messageRepository
                .findByTicketIdOrderByCreatedAtAsc(ticketId)
                .stream()
                .map(message ->
                        new SupportDtos.TicketMessageResponse(
                                message.getId(),
                                message.getSenderType(),
                                message.getSenderName(),
                                message.getSenderEmail(),
                                message.getMessage(),
                                message.getCreatedAt()
                        )
                )
                .toList();
    }
}
