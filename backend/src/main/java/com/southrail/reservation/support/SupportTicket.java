package com.southrail.reservation.support;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.UUID;


@Entity
@Getter
@Setter
@Table(name = "support_tickets")
public class SupportTicket {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, length = 120)
    private String fullName;

    @Column(nullable = false, length = 120)
    private String email;

    @Column(length = 20)
    private String bookingReference;

    @Column(nullable = false, length = 120)
    private String topic;

    @Column(nullable = false, length = 5000)
    private String description;

    @Column(nullable = false, length = 20)
    private String status; // OPEN, IN_PROGRESS, CLOSED

    @Column(nullable = false)
    private LocalDateTime createdAt;
}
