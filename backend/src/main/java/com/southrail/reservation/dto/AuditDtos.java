package com.southrail.reservation.dto;

import java.time.OffsetDateTime;

public class AuditDtos {

    private AuditDtos() {
    }

    public static class AuditLogResponse {

        private String username;
        private String action;
        private String module;
        private String description;
        private OffsetDateTime createdAt;

        public AuditLogResponse() {
        }

        public AuditLogResponse(String username,
                                String action,
                                String module,
                                String description,
                                OffsetDateTime createdAt) {
            this.username = username;
            this.action = action;
            this.module = module;
            this.description = description;
            this.createdAt = createdAt;
        }

        public String getUsername() {
            return username;
        }

        public void setUsername(String username) {
            this.username = username;
        }

        public String getAction() {
            return action;
        }

        public void setAction(String action) {
            this.action = action;
        }

        public String getModule() {
            return module;
        }

        public void setModule(String module) {
            this.module = module;
        }

        public String getDescription() {
            return description;
        }

        public void setDescription(String description) {
            this.description = description;
        }

        public OffsetDateTime getCreatedAt() {
            return createdAt;
        }

        public void setCreatedAt(OffsetDateTime createdAt) {
            this.createdAt = createdAt;
        }
    }
}