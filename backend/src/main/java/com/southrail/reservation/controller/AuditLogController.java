package com.southrail.reservation.controller;

import com.southrail.reservation.dto.AuditDtos;
import com.southrail.reservation.entity.AuditLog;
import com.southrail.reservation.repository.AuditLogRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
    @RestController
    @RequestMapping("/admin/audit-logs")
    public class AuditLogController {
        private final AuditLogRepository auditLogRepository;

        public AuditLogController(AuditLogRepository auditLogRepository) {
            this.auditLogRepository = auditLogRepository;
        }
        @GetMapping
        public Page<AuditDtos.AuditLogResponse> getLogs(Pageable pageable) {

            return auditLogRepository.findAll(
                    PageRequest.of(
                            pageable.getPageNumber(),
                            pageable.getPageSize(),
                            Sort.by("createdAt").descending()
                    )
            ).map(log -> new AuditDtos.AuditLogResponse(
                    log.getUsername(),
                    log.getAction(),
                    log.getModule(),
                    log.getDescription(),
                    log.getCreatedAt()
            ));
        }
    }

