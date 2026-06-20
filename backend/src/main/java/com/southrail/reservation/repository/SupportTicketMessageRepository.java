package com.southrail.reservation.repository;

import com.southrail.reservation.entity.SupportTicketMessage;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface SupportTicketMessageRepository
        extends JpaRepository<SupportTicketMessage, UUID> {

    List<SupportTicketMessage> findByTicketIdOrderByCreatedAtAsc(UUID ticketId);
}
