package com.southrail.reservation.service;

import com.southrail.reservation.dto.SupportDtos;
import com.southrail.reservation.entity.SupportTicket;
import com.southrail.reservation.entity.SupportTicketMessage;
import com.southrail.reservation.entity.User;
import com.southrail.reservation.repository.SupportTicketMessageRepository;
import com.southrail.reservation.repository.SupportTicketRepository;
import com.southrail.reservation.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import com.southrail.reservation.exception.ApiException;
import org.springframework.http.HttpStatus;
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
    @Transactional
    public SupportTicket createTicket(
            SupportDtos.SupportTicketRequest request,
            String email){

        SupportTicket ticket = new SupportTicket();

        User user = userRepository
                .findByEmailIgnoreCase(email)
                .orElseThrow(() ->
                        new ApiException(
                                HttpStatus.NOT_FOUND,
                                "User not found"));
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
    @Transactional(readOnly = true)
    public List<SupportTicket> getMyTickets(String email){

        return repository.findByEmailOrderByCreatedAtDesc(email);
    }
    @Transactional(readOnly = true)
    public SupportTicket getMyTicket(String email, UUID ticketId){


        return repository.findByIdAndEmail(ticketId, email)
                .orElseThrow(() ->
                        new ApiException(
                                HttpStatus.NOT_FOUND,
                                "Ticket not found"));
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
                        new ApiException(
                                HttpStatus.NOT_FOUND,
                                "Ticket not found"));

        String status = request.getStatus();

        if (!List.of("OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED").contains(status)) {
            throw new ApiException(
                    HttpStatus.BAD_REQUEST,
                    "Invalid ticket status");
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
            String email,
            UUID ticketId,
            SupportDtos.TicketMessageRequest request) {


        User user = userRepository
                .findByEmailIgnoreCase(email)
                .orElseThrow(() ->
                        new ApiException(
                                HttpStatus.NOT_FOUND,
                                "Ticket not found"));

        SupportTicket ticket = getUserTicket(email,ticketId);
        if ("CLOSED".equals(ticket.getStatus())) {
            throw new ApiException(
                    HttpStatus.BAD_REQUEST,
                    "Ticket is closed. Messages cannot be added.");
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
            String email,
            UUID ticketId,
            SupportDtos.TicketMessageRequest request){

        User admin = userRepository
                .findByEmailIgnoreCase(email)
                .orElseThrow(() ->
                        new ApiException(
                                HttpStatus.NOT_FOUND,
                                "Admin not found"));

        SupportTicket ticket =
                repository
                        .findById(ticketId)
                        .orElseThrow(()-> new ApiException(HttpStatus.BAD_REQUEST,"Ticket not found"));

        SupportTicketMessage message =
                new SupportTicketMessage();

        message.setTicket(ticket);
        message.setSenderType("ADMIN");
        message.setSenderName(admin.getFullName());
        message.setSenderEmail(admin.getEmail());
        message.setMessage(request.getMessage());
        message.setCreatedAt(LocalDateTime.now());
        if ("CLOSED".equals(ticket.getStatus())) {
            throw new ApiException(HttpStatus.BAD_REQUEST,
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

    private SupportTicket getUserTicket(String email, UUID ticketId) {
        return repository
                .findByIdAndEmail(ticketId, email)
                .orElseThrow(() ->
                        new ApiException(
                                HttpStatus.FORBIDDEN,
                                "Ticket not found or access denied"));
    }
    @Transactional(readOnly = true)
    public List<SupportDtos.TicketMessageResponse> getUserMessages(String email,UUID ticketId) {

        getUserTicket(email,ticketId);

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
