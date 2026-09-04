package com.southrail.reservation.web;

import static org.hamcrest.Matchers.hasSize;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.southrail.reservation.dto.AIDtos;
import com.southrail.reservation.exception.AIException;
import com.southrail.reservation.exception.ApiException;
import jakarta.validation.Valid;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Import(PhaseZeroWebIntegrationTest.ControllerConfiguration.class)
class PhaseZeroWebIntegrationTest {
  @Autowired
  private MockMvc mockMvc;

  @Test
  void returnsCorrelationIdOnSuccessfulRequest() throws Exception {
    mockMvc.perform(get("/trains/phase-zero/success").header(CorrelationIdFilter.HEADER_NAME, "phase-zero-42"))
        .andExpect(status().isOk())
        .andExpect(header().string(CorrelationIdFilter.HEADER_NAME, "phase-zero-42"));
  }

  @Test
  void returnsDeterministicValidationErrorContract() throws Exception {
    mockMvc.perform(post("/trains/phase-zero/validate")
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"message\":\"\",\"model\":\"invalid/model\"}"))
        .andExpect(status().isBadRequest())
        .andExpect(header().exists(CorrelationIdFilter.HEADER_NAME))
        .andExpect(jsonPath("$.errorCode").value("VALIDATION_FAILED"))
        .andExpect(jsonPath("$.correlationId").isNotEmpty())
        .andExpect(jsonPath("$.validationErrors", hasSize(2)))
        .andExpect(jsonPath("$.validationErrors[0].field").value("message"))
        .andExpect(jsonPath("$.validationErrors[1].field").value("model"));
  }

  @Test
  void returnsSafeMalformedJsonResponse() throws Exception {
    mockMvc.perform(post("/trains/phase-zero/validate")
            .contentType(MediaType.APPLICATION_JSON)
            .content("{not-json"))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.errorCode").value("MALFORMED_REQUEST"))
        .andExpect(jsonPath("$.message").value("Request body or parameter is malformed"));
  }

  @Test
  void translatesMissingParameterAndDomainFailure() throws Exception {
    mockMvc.perform(get("/trains/phase-zero/parameter"))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.errorCode").value("MISSING_PARAMETER"));

    mockMvc.perform(get("/trains/phase-zero/domain"))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.errorCode").value("BOOKING_CONFLICT"));
  }

  @Test
  void translatesUnexpectedAndGeminiFailuresSafely() throws Exception {
    mockMvc.perform(get("/trains/phase-zero/unexpected"))
        .andExpect(status().isInternalServerError())
        .andExpect(jsonPath("$.errorCode").value("INTERNAL_ERROR"))
        .andExpect(jsonPath("$.message").value("Unexpected server error"));

    mockMvc.perform(get("/trains/phase-zero/gemini"))
        .andExpect(status().isServiceUnavailable())
        .andExpect(jsonPath("$.errorCode").value("AI_SERVICE_UNAVAILABLE"));
  }

  @Test
  void returnsConsistentUnauthorizedAndForbiddenResponses() throws Exception {
    mockMvc.perform(get("/users/me"))
        .andExpect(status().isUnauthorized())
        .andExpect(jsonPath("$.errorCode").value("AUTHENTICATION_REQUIRED"))
        .andExpect(jsonPath("$.correlationId").isNotEmpty());

    mockMvc.perform(get("/users/me").header("Authorization", "Bearer invalid.jwt.value"))
        .andExpect(status().isUnauthorized())
        .andExpect(jsonPath("$.errorCode").value("AUTHENTICATION_REQUIRED"))
        .andExpect(jsonPath("$.message").value("Authentication is required to access this resource"));

    mockMvc.perform(get("/admin/summary").with(user("passenger").roles("USER")))
        .andExpect(status().isForbidden())
        .andExpect(jsonPath("$.errorCode").value("ACCESS_DENIED"))
        .andExpect(jsonPath("$.correlationId").isNotEmpty());
  }

  @Test
  void exposesCorrelationHeaderForAllowedCorsPreflight() throws Exception {
    mockMvc.perform(options("/bookings")
            .header("Origin", "http://localhost:5173")
            .header("Access-Control-Request-Method", "GET")
            .header("Access-Control-Request-Headers", CorrelationIdFilter.HEADER_NAME))
        .andExpect(status().isOk())
        .andExpect(header().string("Access-Control-Allow-Origin", "http://localhost:5173"))
        .andExpect(header().string("Access-Control-Expose-Headers", CorrelationIdFilter.HEADER_NAME));
  }

  @TestConfiguration
  static class ControllerConfiguration {
    @Bean
    PhaseZeroController phaseZeroController() {
      return new PhaseZeroController();
    }
  }

  @RestController
  @RequestMapping("/trains/phase-zero")
  static class PhaseZeroController {
    @GetMapping("/success")
    String success() {
      return "ok";
    }

    @PostMapping("/validate")
    AIDtos.ChatRequest validate(@Valid @RequestBody AIDtos.ChatRequest request) {
      return request;
    }

    @GetMapping("/parameter")
    String parameter(@RequestParam String value) {
      return value;
    }

    @GetMapping("/domain")
    String domain() {
      throw new ApiException(HttpStatus.CONFLICT, "BOOKING_CONFLICT", "Booking is already cancelled");
    }

    @GetMapping("/unexpected")
    String unexpected() {
      throw new IllegalStateException("internal implementation detail");
    }

    @GetMapping("/gemini")
    String gemini() {
      throw new AIException("Gemini is unavailable");
    }
  }
}
