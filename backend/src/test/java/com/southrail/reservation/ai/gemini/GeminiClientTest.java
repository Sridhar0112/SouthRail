package com.southrail.reservation.ai.gemini;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.southrail.reservation.ai.gemini.GeminiConfiguration;
import com.southrail.reservation.ai.dto.AiDtos;
import com.southrail.reservation.ai.AiException;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import java.io.IOException;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

class GeminiClientTest {
  private HttpServer server;

  @AfterEach
  void stopServer() {
    if (server != null) {
      server.stop(0);
    }
  }

  @Test
  void sendsApiKeyInHeaderRatherThanQueryString() throws Exception {
    AtomicReference<String> apiKeyHeader = new AtomicReference<>();
    AtomicReference<String> query = new AtomicReference<>();
    server = server(exchange -> {
      apiKeyHeader.set(exchange.getRequestHeaders().getFirst("x-goog-api-key"));
      query.set(exchange.getRequestURI().getQuery());
      respond(exchange, 200,
          "{\"candidates\":[{\"content\":{\"parts\":[{\"text\":\"hello\"}]}}],"
              + "\"usageMetadata\":{\"promptTokenCount\":1,\"candidatesTokenCount\":1,\"totalTokenCount\":2}}");
    });

    GeminiClient service = service(1000);
    AiDtos.ChatResponse response = service.chat(
        new AiDtos.ChatRequest("hello", "gemini-test", Double.valueOf(0.7), Integer.valueOf(100)));

    assertThat(response.getResponse()).isEqualTo("hello");
    assertThat(apiKeyHeader.get()).isEqualTo("test-api-key");
    assertThat(query.get()).isNull();
  }

  @Test
  void translatesReadTimeoutToServiceUnavailable() throws Exception {
    server = server(exchange -> {
      try {
        Thread.sleep(300L);
        respond(exchange, 200, "{}");
      } catch (InterruptedException ex) {
        Thread.currentThread().interrupt();
      }
    });

    GeminiClient service = service(50);

    assertThatThrownBy(() -> service.chat(
        new AiDtos.ChatRequest("hello", "gemini-test", Double.valueOf(0.7), Integer.valueOf(100))))
        .isInstanceOfSatisfying(AiException.class, exception -> {
          assertThat(exception.getStatus()).isEqualTo(HttpStatus.SERVICE_UNAVAILABLE);
          assertThat(exception.getErrorCode()).isEqualTo("AI_SERVICE_UNAVAILABLE");
        });
  }

  @Test
  void translatesNonRateLimitUpstreamClientErrorToBadGateway() throws Exception {
    server = server(exchange -> respond(exchange, 400, "{\"error\":\"bad request\"}"));

    GeminiClient service = service(1000);

    assertThatThrownBy(() -> service.chat(
        new AiDtos.ChatRequest("hello", "gemini-test", Double.valueOf(0.7), Integer.valueOf(100))))
        .isInstanceOfSatisfying(AiException.class, exception -> {
          assertThat(exception.getStatus()).isEqualTo(HttpStatus.BAD_GATEWAY);
          assertThat(exception.getErrorCode()).isEqualTo("AI_UPSTREAM_REJECTED_REQUEST");
        });
  }

  @Test
  void translatesRateLimitToServiceUnavailable() throws Exception {
    server = server(exchange -> respond(exchange, 429, "{\"error\":\"rate limited\"}"));

    GeminiClient service = service(1000);

    assertThatThrownBy(() -> service.chat(
        new AiDtos.ChatRequest("hello", "gemini-test", Double.valueOf(0.7), Integer.valueOf(100))))
        .isInstanceOfSatisfying(AiException.class, exception -> {
          assertThat(exception.getStatus()).isEqualTo(HttpStatus.SERVICE_UNAVAILABLE);
          assertThat(exception.getErrorCode()).isEqualTo("AI_SERVICE_UNAVAILABLE");
        });
  }

  @Test
  void translatesUpstreamServerErrorToServiceUnavailable() throws Exception {
    server = server(exchange -> respond(exchange, 500, "{\"error\":\"unavailable\"}"));

    GeminiClient service = service(1000);

    assertThatThrownBy(() -> service.chat(
        new AiDtos.ChatRequest("hello", "gemini-test", Double.valueOf(0.7), Integer.valueOf(100))))
        .isInstanceOfSatisfying(AiException.class, exception -> {
          assertThat(exception.getStatus()).isEqualTo(HttpStatus.SERVICE_UNAVAILABLE);
          assertThat(exception.getErrorCode()).isEqualTo("AI_SERVICE_UNAVAILABLE");
        });
  }

  private GeminiClient service(int readTimeoutMillis) throws IOException {
    GeminiConfiguration config = new GeminiConfiguration();
    config.setApiKey("test-api-key");
    config.setBaseUrl("http://localhost:" + server.getAddress().getPort() + "/v1beta");
    config.setDefaultModel("gemini-test");
    config.setConnectTimeoutMillis(500);
    config.setReadTimeoutMillis(readTimeoutMillis);
    return new GeminiClient(config, config.geminiRestClient(), new ObjectMapper());
  }

  private HttpServer server(ExchangeHandler handler) throws IOException {
    HttpServer httpServer = HttpServer.create(new InetSocketAddress("localhost", 0), 0);
    httpServer.createContext("/v1beta/models/gemini-test:generateContent", exchange -> handler.handle(exchange));
    httpServer.start();
    return httpServer;
  }

  private static void respond(HttpExchange exchange, int status, String body) throws IOException {
    byte[] bytes = body.getBytes(StandardCharsets.UTF_8);
    exchange.getResponseHeaders().add("Content-Type", "application/json");
    exchange.sendResponseHeaders(status, bytes.length);
    exchange.getResponseBody().write(bytes);
    exchange.close();
  }

  @FunctionalInterface
  private interface ExchangeHandler {
    void handle(HttpExchange exchange) throws IOException;
  }
}
