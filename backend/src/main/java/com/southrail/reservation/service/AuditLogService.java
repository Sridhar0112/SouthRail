package com.southrail.reservation.service;

import com.southrail.reservation.entity.AuditLog;
import com.southrail.reservation.repository.AuditLogRepository;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.OffsetDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AuditLogService {

    private final AuditLogRepository auditLogRepository;

    public void log(UUID userId, String username, String action, String module, String description) {
        AuditLog auditLog = new AuditLog();
        auditLog.setId(UUID.randomUUID());
        auditLog.setUserId(userId);
        auditLog.setUsername(username);
        auditLog.setAction(action);
        auditLog.setModule(module);
        auditLog.setDescription(description);
        auditLog.setCreatedAt(OffsetDateTime.now());

        auditLogRepository.save(auditLog);
    }
}
