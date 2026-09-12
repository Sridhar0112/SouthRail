package com.southrail.reservation.shared.security.jwt;

import com.southrail.reservation.shared.security.handler.SecurityErrorResponseWriter;

import com.southrail.reservation.account.AuthenticationAccountLookupService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.List;
import java.util.stream.Collectors;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import io.jsonwebtoken.JwtException;
import org.springframework.dao.DataAccessException;
import org.springframework.http.HttpStatus;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {
  private final JwtService jwtService;
  private final AuthenticationAccountLookupService accounts;
  private final SecurityErrorResponseWriter errorResponseWriter;
  private static final Logger log = LoggerFactory.getLogger(JwtAuthenticationFilter.class);


  public JwtAuthenticationFilter(JwtService jwtService, AuthenticationAccountLookupService accounts,
      SecurityErrorResponseWriter errorResponseWriter) {
    this.jwtService = jwtService;
    this.accounts = accounts;
    this.errorResponseWriter = errorResponseWriter;
  }

  @Override
  protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
      throws ServletException, IOException {
    String header = request.getHeader("Authorization");
    if (header != null && header.startsWith("Bearer ")) {
      try {
        String token = header.substring(7);
        String email = jwtService.subject(token);
        accounts.findEnabledAccount(email)
            .filter(user -> jwtService.isValidFor(token, user))
            .ifPresent(user -> {
              List<SimpleGrantedAuthority> authorities = user.getRoles().stream()
                  .map(role -> new SimpleGrantedAuthority(role.name()))
                  .collect(Collectors.toList());
              UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(
                  user.getEmail(), null, authorities);
              SecurityContextHolder.getContext().setAuthentication(auth);
            });
      } catch (JwtException | IllegalArgumentException ex) {
        log.debug("jwt_validation_failed reason={}", ex.getClass().getSimpleName());
        SecurityContextHolder.clearContext();
      } catch (DataAccessException ex) {
        SecurityContextHolder.clearContext();
        log.error("authentication_user_lookup_failed", ex);
        errorResponseWriter.write(request, response, HttpStatus.SERVICE_UNAVAILABLE,
            "AUTHENTICATION_SERVICE_UNAVAILABLE", "Authentication service is temporarily unavailable");
        return;
      }
    }
    chain.doFilter(request, response);
  }
}
