package com.southrail.reservation.ai.dto;

import lombok.*;

import java.util.List;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public class AiDtos {

    private AiDtos() {
    }

    /* ==========================================
                CHAT REQUEST
       ========================================== */

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ChatRequest {

        @NotBlank
        @Size(max = 4000)
        private String message;

        @Size(max = 100)
        @Pattern(regexp = "[A-Za-z0-9._-]+", message = "model contains unsupported characters")
        private String model;

        @Builder.Default
        @DecimalMin("0.0")
        @DecimalMax("2.0")
        private Double temperature = 0.7;

        @Builder.Default
        @Min(1)
        @Max(8192)
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
