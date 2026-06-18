package com.southrail.reservation.entity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;


@Entity
@Data
@Table(name = "support_tickets")
public class SupportTicket {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    private String fullName;

    private String email;

    private String bookingReference;
    @NotBlank(message = "Topic is required")
    private String topic;

    @Column(length = 5000)
    @NotBlank(message = "Description is required")
    private String description;

    private String status; // OPEN, IN_PROGRESS, CLOSED

    private LocalDateTime createdAt;
}
