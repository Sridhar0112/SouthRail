package com.southrail.reservation.dto;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

public class SupportDtos {

    public SupportDtos() {
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SupportTicketRequest {

        private String fullName;
        private String email;
        private String bookingReference;
        private String topic;
        private String description;
    }
    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UpdateTicketStatusRequest {
        @NotBlank
        private String status;
    }
    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TicketMessageRequest {
        @NotBlank
        private String message;
    }

    @Getter
    @Setter
    @AllArgsConstructor
    public static class TicketMessageResponse {
        private UUID id;
        private String senderType;
        private String senderName;
        private String senderEmail;
        private String message;
        private LocalDateTime createdAt;
    }
}