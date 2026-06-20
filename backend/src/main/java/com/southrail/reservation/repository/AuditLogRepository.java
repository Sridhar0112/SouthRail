package com.southrail.reservation.repository;

import java.util.UUID;
import com.southrail.reservation.entity.AuditLog;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AuditLogRepository extends JpaRepository<AuditLog, UUID> {
}
