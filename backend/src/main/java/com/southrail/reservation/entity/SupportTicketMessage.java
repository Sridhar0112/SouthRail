package com.southrail.reservation.entity;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.UUID;
@Entity
@Table(name = "support_ticket_messages")
@Getter
@Setter
public class SupportTicketMessage {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "ticket_id")
    private SupportTicket ticket;

    @Column(nullable = false, length = 20)
    private String senderType;

    @Column(nullable = false, length = 120)
    private String senderName;

    @Column(nullable = false, length = 120)
    private String senderEmail;

    @Column(nullable = false, columnDefinition = "text")
    private String message;

    @Column(nullable = false)
    private LocalDateTime createdAt;
}