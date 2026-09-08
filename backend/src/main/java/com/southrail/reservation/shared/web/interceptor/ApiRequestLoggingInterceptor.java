package com.southrail.reservation.shared.web.interceptor;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.method.HandlerMethod;
import org.springframework.web.servlet.HandlerInterceptor;
import org.springframework.web.servlet.HandlerMapping;
import org.slf4j.MDC;
import com.southrail.reservation.shared.config.properties.SouthRailLoggingProperties;

@Component
public class ApiRequestLoggingInterceptor implements HandlerInterceptor {
  public static final String ERROR_CODE_ATTRIBUTE = ApiRequestLoggingInterceptor.class.getName() + ".errorCode";
  public static final String EXCEPTION_LOGGED_ATTRIBUTE = ApiRequestLoggingInterceptor.class.getName()
      + ".exceptionLogged";
  private static final Logger log = LoggerFactory.getLogger(ApiRequestLoggingInterceptor.class);
  private static final String START_TIME_ATTRIBUTE = ApiRequestLoggingInterceptor.class.getName() + ".startTime";
  private final long slowRequestThresholdMillis;

  public ApiRequestLoggingInterceptor(SouthRailLoggingProperties properties) {
    this.slowRequestThresholdMillis = properties.getSlowRequestThreshold().toMillis();
  }

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
    Object errorCode = request.getAttribute(ERROR_CODE_ATTRIBUTE);
    String handlerName = handler instanceof HandlerMethod
        ? ((HandlerMethod) handler).getBeanType().getSimpleName() + "#" + ((HandlerMethod) handler).getMethod().getName()
        : handler == null ? "unknown" : handler.getClass().getSimpleName();

    Object routeAttribute = request.getAttribute(HandlerMapping.BEST_MATCHING_PATTERN_ATTRIBUTE);
    String route = routeAttribute == null ? "unmatched" : routeAttribute.toString();
    MDC.put("http.method", request.getMethod());
    MDC.put("http.route", route);
    MDC.put("http.status", Integer.toString(response.getStatus()));
    MDC.put("durationMs", Long.toString(durationMillis));
    try {
      boolean slow = durationMillis >= slowRequestThresholdMillis;
      boolean failed = ex != null || response.getStatus() >= 500;
      boolean exceptionAlreadyLogged = Boolean.TRUE.equals(request.getAttribute(EXCEPTION_LOGGED_ATTRIBUTE));
      if (failed && !exceptionAlreadyLogged) {
        log.warn("event=HTTP_REQUEST_FAILED slow={} authenticated={} handler={} errorCode={} exception={}",
            Boolean.valueOf(slow),
            Boolean.valueOf(authenticated), handlerName, errorCode == null ? "INTERNAL_ERROR" : errorCode,
            ex == null ? "handled" : ex.getClass().getSimpleName());
      } else if (slow && !exceptionAlreadyLogged) {
        log.warn("event=HTTP_SLOW_REQUEST authenticated={} handler={} errorCode={}",
            Boolean.valueOf(authenticated), handlerName, errorCode == null ? "none" : errorCode);
      } else {
        log.debug("event=HTTP_REQUEST_COMPLETED slow={} authenticated={} handler={} errorCode={}",
            Boolean.valueOf(slow),
            Boolean.valueOf(authenticated), handlerName, errorCode == null ? "none" : errorCode);
      }
    } finally {
      MDC.remove("http.method");
      MDC.remove("http.route");
      MDC.remove("http.status");
      MDC.remove("durationMs");
    }
  }
}
