package com.southrail.reservation.web;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.method.HandlerMethod;
import org.springframework.web.servlet.HandlerInterceptor;

@Component
public class ApiRequestLoggingInterceptor implements HandlerInterceptor {
  private static final Logger log = LoggerFactory.getLogger(ApiRequestLoggingInterceptor.class);
  private static final String START_TIME_ATTRIBUTE = ApiRequestLoggingInterceptor.class.getName() + ".startTime";

  @Override
  public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
    request.setAttribute(START_TIME_ATTRIBUTE, Long.valueOf(System.nanoTime()));
    return true;
  }

  @Override
  public void afterCompletion(HttpServletRequest request, HttpServletResponse response, Object handler, Exception ex) {
    Object start = request.getAttribute(START_TIME_ATTRIBUTE);
    long durationMillis = start instanceof Long
        ? (System.nanoTime() - ((Long) start).longValue()) / 1_000_000L
        : -1L;
    boolean authenticated = request.getUserPrincipal() != null;
    String handlerName = handler instanceof HandlerMethod
        ? ((HandlerMethod) handler).getBeanType().getSimpleName() + "#" + ((HandlerMethod) handler).getMethod().getName()
        : handler.getClass().getSimpleName();

    if (ex == null) {
      log.info("request_completed method={} path={} status={} durationMs={} authenticated={} handler={}",
          request.getMethod(), request.getRequestURI(), Integer.valueOf(response.getStatus()),
          Long.valueOf(durationMillis), Boolean.valueOf(authenticated), handlerName);
    } else {
      log.warn("request_failed method={} path={} status={} durationMs={} authenticated={} handler={} exception={}",
          request.getMethod(), request.getRequestURI(), Integer.valueOf(response.getStatus()),
          Long.valueOf(durationMillis), Boolean.valueOf(authenticated), handlerName, ex.getClass().getSimpleName());
    }
  }
}
