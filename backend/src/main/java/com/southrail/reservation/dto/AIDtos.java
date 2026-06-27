package com.southrail.reservation.dto;

import lombok.*;

import java.util.List;

public class AIDtos {

    private AIDtos() {
    }

    /* ==========================================
                CHAT REQUEST
       ========================================== */

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ChatRequest {

        private String message;

        private String model;

        @Builder.Default
        private Double temperature = 0.7;

        @Builder.Default
        private Integer maxTokens = 2048;

    }

    /* ==========================================
                CHAT RESPONSE
       ========================================== */

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ChatResponse {

        private String response;

        private String model;

        private Usage usage;

    }

    /* ==========================================
                  MODEL RESPONSE
       ========================================== */

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ModelResponse {

        private String name;

        private String displayName;

        private String description;

        private List<String> supportedGenerationMethods;

        private Integer inputTokenLimit;

        private Integer outputTokenLimit;

    }

    /* ==========================================
                      USAGE
       ========================================== */

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Usage {

        private Integer promptTokens;

        private Integer completionTokens;

        private Integer totalTokens;

    }

    /* ==========================================
                ERROR RESPONSE
       ========================================== */

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ErrorResponse {

        private String timestamp;

        private Integer status;

        private String error;

        private String message;

        private String path;

    }
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class GenerateContentRequest {

        private SystemInstruction systemInstruction;

        private List<Content> contents;

    }
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class SystemInstruction {

        private List<Part> parts;

    }
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class Part {

        private String text;

    }
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class Content {

        private List<Part> parts;

    }

}