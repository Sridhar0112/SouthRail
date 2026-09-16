package com.southrail.reservation.security.oauth;

import jakarta.servlet.http.*;
import java.io.IOException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.authentication.AuthenticationFailureHandler;
import org.springframework.stereotype.Component;

@Component
public class OAuthLoginFailureHandler implements AuthenticationFailureHandler {
  private final String frontendUrl;
  public OAuthLoginFailureHandler(@Value("${app.frontend-url}") String frontendUrl) {
    this.frontendUrl = frontendUrl.replaceAll("/+$", "");
  }
  @Override public void onAuthenticationFailure(HttpServletRequest request, HttpServletResponse response,
      AuthenticationException exception) throws IOException {
    if (request.getSession(false) != null) request.getSession(false).invalidate();
    response.sendRedirect(frontendUrl + "/oauth/callback?error=authentication_failed");
  }
}
