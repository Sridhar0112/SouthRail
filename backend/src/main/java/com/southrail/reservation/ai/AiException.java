package com.southrail.reservation.ai;

import org.springframework.http.HttpStatus;

public class AiException extends RuntimeException {
    private final HttpStatus status;
    private final String errorCode;

    public AiException(String message) {
        this(HttpStatus.SERVICE_UNAVAILABLE, "AI_SERVICE_UNAVAILABLE", message, null);
    }

    public AiException(String message, Throwable cause) {
        this(HttpStatus.SERVICE_UNAVAILABLE, "AI_SERVICE_UNAVAILABLE", message, cause);
    }

    public AiException(HttpStatus status, String errorCode, String message, Throwable cause) {
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
