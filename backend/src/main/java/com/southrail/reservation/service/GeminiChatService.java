package com.southrail.reservation.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.southrail.reservation.config.GeminiConfig;
import com.southrail.reservation.dto.AIDtos;
import com.southrail.reservation.exception.AIException;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.http.HttpStatus;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class GeminiChatService {

    private final GeminiConfig config;
    private final RestClient restClient;
    private final ObjectMapper mapper = new ObjectMapper();

    public AIDtos.ChatResponse chat(AIDtos.ChatRequest request) {
        String model = request.getModel();
        if (model == null || model.isBlank()) {
            model = config.getDefaultModel();
        }
        String endpoint = String.format("/models/%s:generateContent", model);
        AIDtos.GenerateContentRequest body =
                buildRequest(request.getMessage());
        try {
            String response = restClient.post()
                        .uri(endpoint)
                        .header("x-goog-api-key", config.getApiKey())
                        .contentType(MediaType.APPLICATION_JSON)
                        .body(body)
                        .retrieve()
                        .body(String.class);
            return parseResponse(response, model);
        } catch (RestClientException ex) {
            throw translateFailure(ex);
        }
    }

    private AIDtos.GenerateContentRequest buildRequest(String message) {
        String prompt = """
                You are an AI Assistant.
                
                Current Date : %s
                
                Answer accurately.
                """
                .formatted(LocalDate.now());
        return AIDtos.GenerateContentRequest.builder()
                .systemInstruction(
                        AIDtos.SystemInstruction.builder()
                                .parts(
                                        List.of(
                                                AIDtos.Part.builder()
                                                        .text(prompt)
                                                        .build()
                                        )
                                )
                                .build()
                )
                .contents(
                        List.of(
                                AIDtos.Content.builder()
                                        .parts(
                                                List.of(
                                                        AIDtos.Part.builder()
                                                                .text(message)
                                                                .build()
                                                )
                                        )
                                        .build()
                        )
                )
                .build();
    }

    private AIDtos.ChatResponse parseResponse(String json,
                                              String model) {
        try {
            JsonNode root = mapper.readTree(json);
            JsonNode candidate =
                    root.path("candidates").get(0);
            String answer =
                    candidate
                            .path("content")
                            .path("parts")
                            .get(0)
                            .path("text")
                            .asText();
            JsonNode usage =
                    root.path("usageMetadata");
            return AIDtos.ChatResponse.builder()
                    .model(model)
                    .response(answer)
                    .usage(
                            AIDtos.Usage.builder()
                                    .promptTokens(
                                            usage.path("promptTokenCount").asInt())
                                    .completionTokens(
                                            usage.path("candidatesTokenCount").asInt())
                                    .totalTokens(
                                            usage.path("totalTokenCount").asInt())
                                    .build()
                    )
                    .build();
        } catch (Exception ex) {
            throw new AIException(
                    "Unable to parse Gemini response",
                    ex
            );
        }
    }

    public List<AIDtos.ModelResponse> getModels() {
        try {
            String response = restClient.get()
                    .uri("/models")
                    .header("x-goog-api-key", config.getApiKey())
                    .accept(MediaType.APPLICATION_JSON)
                    .retrieve()
                    .body(String.class);
            return parseModels(response);
        } catch (RestClientException ex) {
            throw translateFailure(ex);
        }
    }

    private AIException translateFailure(RestClientException exception) {
        if (exception instanceof RestClientResponseException) {
            RestClientResponseException responseException = (RestClientResponseException) exception;
            if (responseException.getStatusCode().is4xxClientError()
                    && responseException.getStatusCode().value() != 429) {
                return new AIException(
                        HttpStatus.BAD_GATEWAY,
                        "AI_UPSTREAM_REJECTED_REQUEST",
                        "Gemini rejected the upstream request",
                        exception);
            }
        }
        return new AIException(
                HttpStatus.SERVICE_UNAVAILABLE,
                "AI_SERVICE_UNAVAILABLE",
                "Gemini service is temporarily unavailable",
                exception);
    }

    private List<AIDtos.ModelResponse> parseModels(String json) {
        try {
            JsonNode root = mapper.readTree(json);
            List<AIDtos.ModelResponse> models = new ArrayList<>();
            JsonNode modelArray = root.path("models");
            if (!modelArray.isArray()) {
                return models;
            }
            for (JsonNode model : modelArray) {
                List<String> methods = new ArrayList<>();
                JsonNode generationMethods =
                        model.path("supportedGenerationMethods");
                if (generationMethods.isArray()) {
                    for (JsonNode method : generationMethods) {
                        methods.add(method.asText());
                    }
                }
                models.add(
                        AIDtos.ModelResponse.builder()
                                .name(model.path("name").asText())
                                .displayName(model.path("displayName").asText())
                                .description(model.path("description").asText())
                                .supportedGenerationMethods(methods)
                                .inputTokenLimit(
                                        model.path("inputTokenLimit").asInt())
                                .outputTokenLimit(
                                        model.path("outputTokenLimit").asInt())
                                .build()
                );
            }
            return models;
        } catch (Exception ex) {
            throw new AIException(
                    "Unable to parse Gemini models",
                    ex
            );
        }
    }
}
