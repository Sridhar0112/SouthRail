package com.southrail.reservation.config;

import com.southrail.reservation.web.ApiRequestLoggingInterceptor;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebMvcConfig implements WebMvcConfigurer {
  private final ApiRequestLoggingInterceptor requestLoggingInterceptor;

  public WebMvcConfig(ApiRequestLoggingInterceptor requestLoggingInterceptor) {
    this.requestLoggingInterceptor = requestLoggingInterceptor;
  }

  @Override
  public void addInterceptors(InterceptorRegistry registry) {
    registry.addInterceptor(requestLoggingInterceptor)
        .addPathPatterns("/**")
        .excludePathPatterns("/actuator/**", "/swagger-ui/**", "/v3/api-docs/**", "/error");
  }
}
