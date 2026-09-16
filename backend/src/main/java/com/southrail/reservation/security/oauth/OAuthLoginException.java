package com.southrail.reservation.security.oauth;

public class OAuthLoginException extends RuntimeException {
  private final Reason reason;

  public OAuthLoginException(Reason reason) {
    super(reason.name());
    this.reason = reason;
  }

  public Reason reason() {
    return reason;
  }

  public enum Reason {
    ACCOUNT_CONFLICT("account_conflict"),
    EMAIL_NOT_VERIFIED("email_not_verified"),
    ACCOUNT_DISABLED("account_disabled"),
    AUTHENTICATION_FAILED("authentication_failed");

    private final String redirectValue;

    Reason(String redirectValue) {
      this.redirectValue = redirectValue;
    }

    public String redirectValue() {
      return redirectValue;
    }
  }
}
