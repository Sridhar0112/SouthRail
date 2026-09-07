package com.southrail.reservation.audit;

import java.util.UUID;
import com.southrail.reservation.audit.AuditLog;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AuditLogRepository extends JpaRepository<AuditLog, UUID> {
}
