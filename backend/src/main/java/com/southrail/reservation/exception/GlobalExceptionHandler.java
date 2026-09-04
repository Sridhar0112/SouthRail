package com.southrail.reservation.exception;

import com.southrail.reservation.web.CorrelationIdFilter;
import com.southrail.reservation.web.ApiRequestLoggingInterceptor;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.ConstraintViolationException;
import java.time.Instant;
import java.util.List;
import java.util.Comparator;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.mapping.PropertyReferenceException;

@RestControllerAdvice
public class GlobalExceptionHandler {
  private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

  @ExceptionHandler(ApiException.class)
  ResponseEntity<ApiErrorResponse> api(ApiException ex, HttpServletRequest request) {
    return error(ex.status(), ex.errorCode(), ex.getMessage(), request, ex.instant(), null);
  }

  @ExceptionHandler(AIException.class)
  ResponseEntity<ApiErrorResponse> ai(AIException ex, HttpServletRequest request) {
    log.error("optional_dependency_failure dependency=gemini method={} path={}",
        request.getMethod(), request.getRequestURI(), ex);
    return error(ex.getStatus(), ex.getErrorCode(),
        "AI assistant is temporarily unavailable", request, null, null);
  }

  @ExceptionHandler(MethodArgumentNotValidException.class)
  ResponseEntity<ApiErrorResponse> validation(MethodArgumentNotValidException ex, HttpServletRequest request) {
    List<ApiErrorResponse.ValidationError> errors = ex.getBindingResult().getFieldErrors().stream()
        .map(this::toValidationError)
        .sorted(validationErrorComparator())
        .collect(Collectors.toList());
    String message = errors.isEmpty() ? "Validation failed" : errors.get(0).getMessage();
    return error(HttpStatus.BAD_REQUEST, "VALIDATION_FAILED", message, request, null, errors);
  }

  @ExceptionHandler(ConstraintViolationException.class)
  ResponseEntity<ApiErrorResponse> constraintViolation(ConstraintViolationException ex, HttpServletRequest request) {
    List<ApiErrorResponse.ValidationError> errors = ex.getConstraintViolations().stream()
        .map(violation -> new ApiErrorResponse.ValidationError(
            violation.getPropertyPath().toString(), violation.getMessage()))
        .sorted(validationErrorComparator())
        .collect(Collectors.toList());
    return error(HttpStatus.BAD_REQUEST, "VALIDATION_FAILED", "Validation failed", request, null, errors);
  }

  @ExceptionHandler(MissingServletRequestParameterException.class)
  ResponseEntity<ApiErrorResponse> missingParameter(MissingServletRequestParameterException ex,
      HttpServletRequest request) {
    List<ApiErrorResponse.ValidationError> errors = java.util.Collections.singletonList(
        new ApiErrorResponse.ValidationError(ex.getParameterName(), "parameter is required"));
    return error(HttpStatus.BAD_REQUEST, "MISSING_PARAMETER", "Required request parameter is missing",
        request, null, errors);
  }

  @ExceptionHandler(DataIntegrityViolationException.class)
  ResponseEntity<ApiErrorResponse> dataConflict(DataIntegrityViolationException ex, HttpServletRequest request) {
    log.warn("database_constraint_conflict method={} path={}", request.getMethod(), request.getRequestURI());
    return error(HttpStatus.CONFLICT, "DATA_CONFLICT",
        "The request conflicts with existing data", request, null, null);
  }

  @ExceptionHandler(PropertyReferenceException.class)
  ResponseEntity<ApiErrorResponse> invalidSort(PropertyReferenceException ex, HttpServletRequest request) {
    return error(HttpStatus.BAD_REQUEST, "INVALID_SORT", "Requested sort field is invalid",
        request, null, null);
  }

  @ExceptionHandler({HttpMessageNotReadableException.class, MethodArgumentTypeMismatchException.class})
  ResponseEntity<ApiErrorResponse> malformedRequest(Exception ex, HttpServletRequest request) {
    return error(HttpStatus.BAD_REQUEST, "MALFORMED_REQUEST", "Request body or parameter is malformed",
        request, null, null);
  }

  @ExceptionHandler(IllegalArgumentException.class)
  ResponseEntity<ApiErrorResponse> badRequest(IllegalArgumentException ex, HttpServletRequest request) {
    return error(HttpStatus.BAD_REQUEST, "INVALID_ARGUMENT", ex.getMessage(), request, null, null);
  }

  @ExceptionHandler(Exception.class)
  ResponseEntity<ApiErrorResponse> fallback(Exception ex, HttpServletRequest request) {
    log.error("unexpected_request_failure method={} path={}", request.getMethod(), request.getRequestURI(), ex);
    return error(HttpStatus.INTERNAL_SERVER_ERROR, "INTERNAL_ERROR",
        "Unexpected server error", request, null, null);
  }

  private ApiErrorResponse.ValidationError toValidationError(FieldError error) {
    return new ApiErrorResponse.ValidationError(error.getField(), error.getDefaultMessage());
  }

  private Comparator<ApiErrorResponse.ValidationError> validationErrorComparator() {
    return Comparator.comparing(ApiErrorResponse.ValidationError::getField)
        .thenComparing(ApiErrorResponse.ValidationError::getMessage);
  }

  private ResponseEntity<ApiErrorResponse> error(HttpStatus status, String errorCode, String message,
      HttpServletRequest request, Instant lockedUntil, List<ApiErrorResponse.ValidationError> validationErrors) {
    request.setAttribute(ApiRequestLoggingInterceptor.ERROR_CODE_ATTRIBUTE, errorCode);
    ApiErrorResponse body = new ApiErrorResponse(
        Instant.now(), status.value(), status.getReasonPhrase(), errorCode, message, request.getRequestURI(),
        MDC.get(CorrelationIdFilter.MDC_KEY), lockedUntil, validationErrors);
    return ResponseEntity.status(status).body(body);
  }
}
