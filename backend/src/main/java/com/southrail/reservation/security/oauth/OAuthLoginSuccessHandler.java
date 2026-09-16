package com.southrail.reservation.security.oauth;

import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.oidc.user.OidcUser;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.stereotype.Component;

@Component
public class OAuthLoginSuccessHandler implements AuthenticationSuccessHandler {
  private final GoogleOAuthService service;
  private final String frontendUrl;
  public OAuthLoginSuccessHandler(GoogleOAuthService service,
      @Value("${app.frontend-url}") String frontendUrl) {
    this.service = service;
    this.frontendUrl = frontendUrl.replaceAll("/+$", "");
  }
  @Override public void onAuthenticationSuccess(HttpServletRequest request, HttpServletResponse response,
      Authentication authentication) throws IOException, ServletException {
    try {
      String code = service.createExchangeCode((OidcUser) authentication.getPrincipal());
      if (request.getSession(false) != null) request.getSession(false).invalidate();
      response.sendRedirect(frontendUrl + "/oauth/callback?code="
          + URLEncoder.encode(code, StandardCharsets.UTF_8));
    } catch (OAuthLoginException ex) {
      if (request.getSession(false) != null) request.getSession(false).invalidate();
      response.sendRedirect(frontendUrl + "/oauth/callback?error=" + ex.reason().redirectValue());
    } catch (RuntimeException ex) {
      if (request.getSession(false) != null) request.getSession(false).invalidate();
      response.sendRedirect(frontendUrl + "/oauth/callback?error=authentication_failed");
    }
  }
}
