package com.southrail.reservation.exception;

import org.springframework.http.HttpStatus;

import java.time.Instant;

public class ApiException extends RuntimeException {
  private final HttpStatus status;
  private final String errorCode;
  private final Instant instant;

  public ApiException(HttpStatus status, String message) {
    this(status, defaultCode(status), message, null);
  }

  public ApiException(HttpStatus status, String message, Instant instant){
    this(status, defaultCode(status), message, instant);
  }

  public ApiException(HttpStatus status, String errorCode, String message) {
    this(status, errorCode, message, null);
  }

  private ApiException(HttpStatus status, String errorCode, String message, Instant instant) {
    super(message);
    this.status = status;
    this.errorCode = errorCode;
    this.instant = instant;
  }

  public Instant instant() {
    return instant;
  }
  public HttpStatus status() {
    return status;
  }

  public String errorCode() {
    return errorCode;
  }

  private static String defaultCode(HttpStatus status) {
    return "API_" + status.name();
  }
}
