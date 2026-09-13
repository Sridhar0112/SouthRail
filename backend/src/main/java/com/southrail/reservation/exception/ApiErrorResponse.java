package com.southrail.reservation.exception;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.time.Instant;
import java.util.List;

@JsonInclude(JsonInclude.Include.NON_NULL)
public class ApiErrorResponse {
  private final Instant timestamp;
  private final int status;
  private final String error;
  private final String errorCode;
  private final String message;
  private final String path;
  private final String correlationId;
  private final Instant lockedUntil;
  private final List<ValidationError> validationErrors;

  public ApiErrorResponse(Instant timestamp, int status, String error, String errorCode, String message,
      String path, String correlationId, Instant lockedUntil, List<ValidationError> validationErrors) {
    this.timestamp = timestamp;
    this.status = status;
    this.error = error;
    this.errorCode = errorCode;
    this.message = message;
    this.path = path;
    this.correlationId = correlationId;
    this.lockedUntil = lockedUntil;
    this.validationErrors = validationErrors;
  }

  public Instant getTimestamp() { return timestamp; }
  public int getStatus() { return status; }
  public String getError() { return error; }
  public String getErrorCode() { return errorCode; }
  public String getMessage() { return message; }
  public String getPath() { return path; }
  public String getCorrelationId() { return correlationId; }
  public Instant getLockedUntil() { return lockedUntil; }
  public List<ValidationError> getValidationErrors() { return validationErrors; }

  public static class ValidationError {
    private final String field;
    private final String message;

    public ValidationError(String field, String message) {
      this.field = field;
      this.message = message;
    }

    public String getField() { return field; }
    public String getMessage() { return message; }
  }
}
