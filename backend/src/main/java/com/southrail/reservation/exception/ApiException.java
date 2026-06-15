package com.southrail.reservation.exception;

import org.springframework.http.HttpStatus;

import java.time.Instant;

public class ApiException extends RuntimeException {
  private final HttpStatus status;
  private Instant instant;
  public ApiException(HttpStatus status, String message) {
    super(message);
    this.status = status;
  }
  public ApiException(HttpStatus status, String message, Instant instant){
    super(message);
    this.status=status;
    this.instant=instant;
  }

  public Instant instant() {
    return instant;
  }
  public HttpStatus status() {
    return status;
  }
}
