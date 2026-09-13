package com.southrail.reservation.repository.audit;

import java.util.UUID;
import com.southrail.reservation.entity.audit.AuditLog;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AuditLogRepository extends JpaRepository<AuditLog, UUID> {
}
