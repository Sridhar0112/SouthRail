package com.southrail.reservation.ai.gemini;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.southrail.reservation.ai.gemini.GeminiConfiguration;
import com.southrail.reservation.ai.dto.AiDtos;
import com.southrail.reservation.ai.AiException;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.http.HttpStatus;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

@Service
@RequiredArgsConstructor
public class GeminiClient {

    private final GeminiConfiguration config;
    private final RestClient restClient;
    private final ObjectMapper mapper;

    public AiDtos.ChatResponse chat(AiDtos.ChatRequest request) {
        String model = request.getModel();
        if (model == null || model.trim().isEmpty()) {
            model = config.getDefaultModel();
        }
        String endpoint = String.format("/models/%s:generateContent", model);
        AiDtos.GenerateContentRequest body =
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
        } catch (org.springframework.web.client.RestClientResponseException ex) {
            if (ex.getStatusCode().is4xxClientError()) {
                throw new com.southrail.reservation.shared.web.error.ApiException(
                        org.springframework.http.HttpStatus.BAD_REQUEST,
                        "AI_REQUEST_INVALID",
                        "Request to the AI service was rejected");
            }
            throw new AiException("Gemini service is temporarily unavailable", ex);
        } catch (RestClientException ex) {
            throw translateFailure(ex);
        }
    }

    private AiDtos.GenerateContentRequest buildRequest(String message) {
        String prompt = String.format(
                "You are an AI Assistant.\n\nCurrent Date : %s\n\nAnswer accurately.\n",
                LocalDate.now());
        return AiDtos.GenerateContentRequest.builder()
                .systemInstruction(
                        AiDtos.SystemInstruction.builder()
                                .parts(
                                        Collections.singletonList(
                                                AiDtos.Part.builder()
                                                        .text(prompt)
                                                        .build()
                                        )
                                )
                                .build()
                )
                .contents(
                        Collections.singletonList(
                                AiDtos.Content.builder()
                                        .parts(
                                                Collections.singletonList(
                                                        AiDtos.Part.builder()
                                                                .text(message)
                                                                .build()
                                                )
                                        )
                                        .build()
                        )
                )
                .build();
    }

    private AiDtos.ChatResponse parseResponse(String json,
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
            return AiDtos.ChatResponse.builder()
                    .model(model)
                    .response(answer)
                    .usage(
                            AiDtos.Usage.builder()
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
            throw new AiException(
                    "Unable to parse Gemini response",
                    ex
            );
        }
    }

    public List<AiDtos.ModelResponse> getModels() {
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

    private AiException translateFailure(RestClientException exception) {
        if (exception instanceof RestClientResponseException) {
            RestClientResponseException responseException = (RestClientResponseException) exception;
            if (responseException.getStatusCode().is4xxClientError()
                    && responseException.getStatusCode().value() != 429) {
                return new AiException(
                        HttpStatus.BAD_GATEWAY,
                        "AI_UPSTREAM_REJECTED_REQUEST",
                        "Gemini rejected the upstream request",
                        exception);
            }
        }
        return new AiException(
                HttpStatus.SERVICE_UNAVAILABLE,
                "AI_SERVICE_UNAVAILABLE",
                "Gemini service is temporarily unavailable",
                exception);
    }

    private List<AiDtos.ModelResponse> parseModels(String json) {
        try {
            JsonNode root = mapper.readTree(json);
            List<AiDtos.ModelResponse> models = new ArrayList<>();
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
                        AiDtos.ModelResponse.builder()
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
            throw new AiException(
                    "Unable to parse Gemini models",
                    ex
            );
        }
    }
}
