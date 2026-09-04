package com.southrail.reservation.security;

import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.stereotype.Component;

@Component
public class ApiAuthenticationEntryPoint implements AuthenticationEntryPoint {
  private final SecurityErrorResponseWriter responseWriter;

  public ApiAuthenticationEntryPoint(SecurityErrorResponseWriter responseWriter) {
    this.responseWriter = responseWriter;
  }

  @Override
  public void commence(HttpServletRequest request, HttpServletResponse response,
      AuthenticationException authenticationException) throws IOException, ServletException {
    responseWriter.write(request, response, HttpStatus.UNAUTHORIZED, "AUTHENTICATION_REQUIRED",
        "Authentication is required to access this resource");
  }
}
