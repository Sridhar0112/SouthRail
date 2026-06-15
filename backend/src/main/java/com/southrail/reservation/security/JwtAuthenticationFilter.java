package com.southrail.reservation.security;

import com.southrail.reservation.repository.UserRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.List;
import java.util.stream.Collectors;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {
  private final JwtService jwtService;
  private final UserRepository users;

  public JwtAuthenticationFilter(JwtService jwtService, UserRepository users) {
    this.jwtService = jwtService;
    this.users = users;
  }

  @Override
  protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
      throws ServletException, IOException {
    String header = request.getHeader("Authorization");
    if (header != null && header.startsWith("Bearer ")) {
      try {
        String email = jwtService.subject(header.substring(7));
        users.findByEmailIgnoreCase(email).ifPresent(user -> {
          List<SimpleGrantedAuthority> authorities = user.getRoles().stream()
              .map(role -> new SimpleGrantedAuthority(role.name()))
              .collect(Collectors.toList());
          UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(user.getEmail(), null, authorities);
          SecurityContextHolder.getContext().setAuthentication(auth);
        });
      } catch (RuntimeException ignored) {
        SecurityContextHolder.clearContext();
      }
    }
    chain.doFilter(request, response);
  }
}
