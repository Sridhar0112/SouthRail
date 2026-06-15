package com.southrail.reservation.exception;

import jakarta.servlet.http.HttpServletRequest;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {

  @ExceptionHandler(ApiException.class)
  ResponseEntity<Map<String, Object>> api(
          ApiException ex,
          HttpServletRequest request) {

    return error(
            ex.status(),
            ex.getMessage(),
            request.getRequestURI(),
            ex.instant());
  }

  @ExceptionHandler(MethodArgumentNotValidException.class)
  ResponseEntity<Map<String, Object>> validation(
          MethodArgumentNotValidException ex,
          HttpServletRequest request) {

    String message = ex.getBindingResult()
            .getFieldErrors()
            .stream()
            .findFirst()
            .map(FieldError::getDefaultMessage)
            .orElse("Validation failed");

    return error(
            HttpStatus.BAD_REQUEST,
            message,
            request.getRequestURI(),
            null);
  }

  @ExceptionHandler(IllegalArgumentException.class)
  ResponseEntity<Map<String, Object>> badRequest(
          IllegalArgumentException ex,
          HttpServletRequest request) {

    return error(
            HttpStatus.BAD_REQUEST,
            ex.getMessage(),
            request.getRequestURI(),
            null);
  }

  @ExceptionHandler(Exception.class)
  ResponseEntity<Map<String, Object>> fallback(
          Exception ex,
          HttpServletRequest request) {

    return error(
            HttpStatus.INTERNAL_SERVER_ERROR,
            "Unexpected server error",
            request.getRequestURI(),
            null);
  }

  private ResponseEntity<Map<String, Object>> error(
          HttpStatus status,
          String message,
          String path,
          Instant lockedUntil) {

    Map<String, Object> body = new LinkedHashMap<>();

    body.put("timestamp", Instant.now().toString());
    body.put("status", status.value());
    body.put("error", status.getReasonPhrase());
    body.put("message", message);
    body.put("path", path);

    if (lockedUntil != null) {
      body.put("lockedUntil", lockedUntil.toString());
    }

    return ResponseEntity.status(status).body(body);
  }
}