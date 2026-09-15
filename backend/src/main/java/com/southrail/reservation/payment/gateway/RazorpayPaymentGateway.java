package com.southrail.reservation.payment.gateway;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.southrail.reservation.config.properties.RazorpayProperties;
import com.southrail.reservation.exception.ApiException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Base64;
import java.util.List;
import java.util.Map;
import java.util.stream.StreamSupport;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

@Component
public class RazorpayPaymentGateway implements PaymentGateway {
  private final RazorpayProperties config;
  private final ObjectMapper json;
  private final HttpClient http;

  @Autowired
  public RazorpayPaymentGateway(RazorpayProperties config, ObjectMapper json) {
    this(config, json, HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(3)).build());
  }

  RazorpayPaymentGateway(RazorpayProperties config, ObjectMapper json, HttpClient http) {
    this.config = config;
    this.json = json;
    this.http = http;
  }

  @Override
  public GatewayOrder createOrder(
      long amount, String currency, String receipt, Map<String, String> notes) {
    JsonNode response = call("POST", "/orders", Map.of(
        "amount", amount,
        "currency", currency,
        "receipt", receipt,
        "notes", notes), null);
    return new GatewayOrder(
        response.path("id").asText(),
        response.path("amount").asLong(),
        response.path("currency").asText(),
        response.path("status").asText());
  }

  @Override
  public GatewayPayment fetchPayment(String id) {
    JsonNode response = call("GET", "/payments/" + id, null, null);
    return new GatewayPayment(
        response.path("id").asText(),
        response.path("order_id").asText(),
        response.path("amount").asLong(),
        response.path("currency").asText(),
        response.path("status").asText());
  }

  @Override
  public List<GatewayPayment> fetchPaymentsForOrder(String orderId) {
    JsonNode response = call("GET", "/orders/" + orderId + "/payments", null, null);
    return StreamSupport.stream(response.path("items").spliterator(), false)
        .map(item -> new GatewayPayment(
            item.path("id").asText(),
            item.path("order_id").asText(),
            item.path("amount").asLong(),
            item.path("currency").asText(),
            item.path("status").asText()))
        .toList();
  }

  @Override
  public GatewayRefund initiateRefund(String id, long amount, String key) {
    JsonNode response = call(
        "POST",
        "/payments/" + id + "/refund",
        Map.of("amount", amount, "notes", Map.of("southrail_idempotency_key", key)),
        key);
    return new GatewayRefund(
        response.path("id").asText(),
        response.path("amount").asLong(),
        response.path("status").asText());
  }

  private JsonNode call(String method, String path, Object body, String idempotencyKey) {
    if (!config.enabled()) {
      throw new ApiException(
          HttpStatus.SERVICE_UNAVAILABLE,
          "RAZORPAY_UNAVAILABLE",
          "Payment gateway is not enabled");
    }
    try {
      String credentials = config.keyId() + ":" + config.keySecret();
      HttpRequest.Builder request = HttpRequest.newBuilder(URI.create(config.baseUrl() + path))
          .timeout(Duration.ofSeconds(10))
          .header("Authorization", "Basic " + Base64.getEncoder().encodeToString(
              credentials.getBytes(StandardCharsets.UTF_8)))
          .header("Content-Type", "application/json");
      if (idempotencyKey != null) {
        request.header("X-Razorpay-Idempotency-Key", idempotencyKey);
      }
      HttpRequest built = body == null
          ? request.GET().build()
          : request.method(method, HttpRequest.BodyPublishers.ofString(
              json.writeValueAsString(body))).build();
      HttpResponse<String> response = http.send(built, HttpResponse.BodyHandlers.ofString());
      if (response.statusCode() / 100 != 2) {
        throw unavailable();
      }
      return json.readTree(response.body());
    } catch (InterruptedException exception) {
      Thread.currentThread().interrupt();
      throw unavailable();
    } catch (ApiException exception) {
      throw exception;
    } catch (Exception exception) {
      throw unavailable();
    }
  }

  private ApiException unavailable() {
    return new ApiException(
        HttpStatus.SERVICE_UNAVAILABLE,
        "RAZORPAY_UNAVAILABLE",
        "Payment provider is temporarily unavailable");
  }
}
