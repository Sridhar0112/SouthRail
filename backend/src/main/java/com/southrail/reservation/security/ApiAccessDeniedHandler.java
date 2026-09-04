package com.southrail.reservation.security;

import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.stereotype.Component;

@Component
public class ApiAccessDeniedHandler implements AccessDeniedHandler {
  private final SecurityErrorResponseWriter responseWriter;

  public ApiAccessDeniedHandler(SecurityErrorResponseWriter responseWriter) {
    this.responseWriter = responseWriter;
  }

  @Override
  public void handle(HttpServletRequest request, HttpServletResponse response,
      AccessDeniedException accessDeniedException) throws IOException, ServletException {
    responseWriter.write(request, response, HttpStatus.FORBIDDEN, "ACCESS_DENIED",
        "You are not authorized to access this resource");
  }
}
