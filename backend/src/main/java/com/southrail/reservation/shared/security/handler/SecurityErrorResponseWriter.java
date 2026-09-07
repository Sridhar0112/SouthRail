package com.southrail.reservation.shared.security.handler;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.southrail.reservation.shared.web.error.ApiErrorResponse;
import com.southrail.reservation.shared.web.filter.CorrelationIdFilter;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.time.Instant;
import org.slf4j.MDC;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;

@Component
public class SecurityErrorResponseWriter {
  private final ObjectMapper objectMapper;

  public SecurityErrorResponseWriter(ObjectMapper objectMapper) {
    this.objectMapper = objectMapper;
  }

  public void write(HttpServletRequest request, HttpServletResponse response, HttpStatus status,
      String errorCode, String message) throws IOException {
    response.setStatus(status.value());
    response.setContentType(MediaType.APPLICATION_JSON_VALUE);
    ApiErrorResponse body = new ApiErrorResponse(Instant.now(), status.value(), status.getReasonPhrase(),
        errorCode, message, request.getRequestURI(), MDC.get(CorrelationIdFilter.MDC_KEY), null, null);
    objectMapper.writeValue(response.getOutputStream(), body);
  }
}
