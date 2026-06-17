package com.southrail.reservation.repository;

import com.southrail.reservation.entity.SupportTicket;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface SupportTicketRepository
        extends JpaRepository<SupportTicket, UUID> {
}
