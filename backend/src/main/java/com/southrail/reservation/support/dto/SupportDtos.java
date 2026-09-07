package com.southrail.reservation.support.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
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

        @Size(max = 120)
        private String fullName;
        @Email
        @Size(max = 120)
        private String email;
        @Size(max = 20)
        private String bookingReference;
        @NotBlank
        @Size(max = 120)
        private String topic;
        @NotBlank
        @Size(max = 5000)
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
        @Size(max = 4000)
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
