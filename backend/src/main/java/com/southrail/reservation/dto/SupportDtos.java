package com.southrail.reservation.dto;

import jakarta.persistence.*;
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
}