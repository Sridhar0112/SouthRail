package com.southrail.reservation.exception;

import org.springframework.http.HttpStatus;

public class AIException extends RuntimeException {
    private final HttpStatus status;
    private final String errorCode;

    public AIException(String message) {
        this(HttpStatus.SERVICE_UNAVAILABLE, "AI_SERVICE_UNAVAILABLE", message, null);
    }

    public AIException(String message, Throwable cause) {
        this(HttpStatus.SERVICE_UNAVAILABLE, "AI_SERVICE_UNAVAILABLE", message, cause);
    }

    public AIException(HttpStatus status, String errorCode, String message, Throwable cause) {
        super(message, cause);
        this.status = status;
        this.errorCode = errorCode;
    }

    public HttpStatus getStatus() {
        return status;
    }

    public String getErrorCode() {
        return errorCode;
    }

}
