package com.southrail.reservation.shared.web;

import com.southrail.reservation.shared.web.interceptor.ApiRequestLoggingInterceptor;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebMvcConfiguration implements WebMvcConfigurer {
  private final ApiRequestLoggingInterceptor requestLoggingInterceptor;

  public WebMvcConfiguration(ApiRequestLoggingInterceptor requestLoggingInterceptor) {
    this.requestLoggingInterceptor = requestLoggingInterceptor;
  }

  @Override
  public void addInterceptors(InterceptorRegistry registry) {
    registry.addInterceptor(requestLoggingInterceptor)
        .addPathPatterns("/**")
        .excludePathPatterns("/actuator/**", "/swagger-ui/**", "/v3/api-docs/**", "/error");
  }
}
