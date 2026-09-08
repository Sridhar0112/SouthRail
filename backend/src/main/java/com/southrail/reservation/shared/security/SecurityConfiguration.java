package com.southrail.reservation.shared.security;

import com.southrail.reservation.shared.security.jwt.JwtAuthenticationFilter;
import com.southrail.reservation.shared.security.handler.ApiAccessDeniedHandler;
import com.southrail.reservation.shared.security.handler.ApiAuthenticationEntryPoint;
import com.southrail.reservation.shared.web.filter.CorrelationIdFilter;
import com.southrail.reservation.shared.config.properties.SouthRailCorsProperties;
import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.ProviderManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.boot.web.servlet.FilterRegistrationBean;

@Configuration
@EnableMethodSecurity
public class SecurityConfiguration {
  @Bean
  FilterRegistrationBean<JwtAuthenticationFilter> disableJwtServletRegistration(
      JwtAuthenticationFilter jwtAuthenticationFilter) {
    FilterRegistrationBean<JwtAuthenticationFilter> registration =
        new FilterRegistrationBean<>(jwtAuthenticationFilter);
    registration.setEnabled(false);
    return registration;
  }

  @Bean
  SecurityFilterChain securityFilterChain(HttpSecurity http, JwtAuthenticationFilter jwtFilter,
      ApiAuthenticationEntryPoint authenticationEntryPoint, ApiAccessDeniedHandler accessDeniedHandler) throws Exception {
    return http
        .csrf(csrf -> csrf.disable())
        .cors(cors -> {})
        .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
        .exceptionHandling(exceptions -> exceptions
            .authenticationEntryPoint(authenticationEntryPoint)
            .accessDeniedHandler(accessDeniedHandler))
            .authorizeHttpRequests(auth -> auth
                    .requestMatchers("/auth/**", "/swagger-ui/**", "/swagger-ui.html", "/v3/api-docs/**").permitAll()
                    .requestMatchers("/actuator/health/liveness", "/actuator/health/readiness").permitAll()
                    .requestMatchers("/actuator/**").hasRole("ADMIN")
                    .requestMatchers("/trains/**").permitAll()
                    .requestMatchers("/chat").permitAll()
                    .requestMatchers("/chat/**").permitAll()
                    .requestMatchers(HttpMethod.GET, "/pnr/**").permitAll()
                    .requestMatchers("/admin/**").hasRole("ADMIN")
                    .anyRequest().authenticated()
            )
        .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class)
        .build();
  }

  @Bean
  UserDetailsService userDetailsService(com.southrail.reservation.account.UserRepository users) {
    return email -> users.findByEmailIgnoreCase(email)
        .map(user -> org.springframework.security.core.userdetails.User
            .withUsername(user.getEmail())
            .password(user.getPasswordHash())
            .disabled(!user.isEnabled())
            .authorities(user.getRoles().stream().map(Enum::name).toArray(String[]::new))
            .build())
        .orElseThrow(() -> new org.springframework.security.core.userdetails.UsernameNotFoundException(email));
  }

  @Bean
  AuthenticationManager authenticationManager(UserDetailsService userDetailsService, PasswordEncoder passwordEncoder) {
    DaoAuthenticationProvider provider = new DaoAuthenticationProvider();
    provider.setUserDetailsService(userDetailsService);
    provider.setPasswordEncoder(passwordEncoder);
    return new ProviderManager(provider);
  }

  @Bean
  PasswordEncoder passwordEncoder() {
    return new BCryptPasswordEncoder();
  }

  @Bean
  CorsConfigurationSource corsConfigurationSource(SouthRailCorsProperties properties) {
    List<String> origins = properties.getAllowedOrigins();
    if (origins.isEmpty() || origins.stream().anyMatch(origin -> origin == null || origin.trim().isEmpty())) {
      throw new IllegalStateException("At least one explicit CORS origin must be configured");
    }
    CorsConfiguration config = new CorsConfiguration();
    config.setAllowedOrigins(origins.stream().map(String::trim).collect(Collectors.toList()));
    config.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
    config.setAllowedHeaders(Arrays.asList("Authorization", "Content-Type", CorrelationIdFilter.HEADER_NAME));
    config.setExposedHeaders(Arrays.asList(CorrelationIdFilter.HEADER_NAME));
    config.setAllowCredentials(true);
    config.setMaxAge(3600L);
    config.validateAllowCredentials();
    UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
    source.registerCorsConfiguration("/**", config);
    return request -> isManagementRequest(request.getRequestURI(), request.getContextPath())
        ? null
        : source.getCorsConfiguration(request);
  }

  private boolean isManagementRequest(String requestUri, String contextPath) {
    String applicationPath = requestUri.substring(contextPath.length());
    return "/actuator".equals(applicationPath) || applicationPath.startsWith("/actuator/");
  }
}
