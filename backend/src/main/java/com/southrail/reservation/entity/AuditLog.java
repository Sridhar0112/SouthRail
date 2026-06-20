package com.southrail.reservation.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import java.util.UUID;
import lombok.*;

@Entity
@Table(name = "audit_logs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AuditLog {

    @Id
    private UUID id;

    private UUID userId;

    private String username;

    private String action;

    private String module;

    @Column(columnDefinition = "text")
    private String description;

    private String ipAddress;

    @Column(columnDefinition = "text")
    private String userAgent;

    private OffsetDateTime createdAt;
}
