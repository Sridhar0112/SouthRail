package com.southrail.reservation.shared.web.interceptor;

import static org.assertj.core.api.Assertions.assertThat;

import ch.qos.logback.classic.Level;
import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import com.southrail.reservation.shared.config.properties.SouthRailLoggingProperties;
import java.time.Duration;
import org.junit.jupiter.api.Test;
import org.slf4j.LoggerFactory;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

class ApiRequestLoggingInterceptorTest {
  @Test
  void classifiesSlowServerFailureAsOneFailedRequestEvent() throws Exception {
    SouthRailLoggingProperties properties = new SouthRailLoggingProperties();
    properties.setSlowRequestThreshold(Duration.ofNanos(1));
    ApiRequestLoggingInterceptor interceptor = new ApiRequestLoggingInterceptor(properties);
    MockHttpServletRequest request = new MockHttpServletRequest("GET", "/test");
    MockHttpServletResponse response = new MockHttpServletResponse();
    response.setStatus(500);
    ListAppender<ILoggingEvent> appender = appender();

    interceptor.preHandle(request, response, new Object());
    interceptor.afterCompletion(request, response, new Object(), null);

    assertThat(appender.list).hasSize(1);
    assertThat(appender.list.get(0).getLevel()).isEqualTo(Level.WARN);
    assertThat(appender.list.get(0).getFormattedMessage())
        .contains("event=HTTP_REQUEST_FAILED")
        .contains("slow=true")
        .doesNotContain("HTTP_SLOW_REQUEST");
    detach(appender);
  }

  @Test
  void doesNotDuplicateAnExceptionAlreadyLoggedByTheBoundary() throws Exception {
    SouthRailLoggingProperties properties = new SouthRailLoggingProperties();
    ApiRequestLoggingInterceptor interceptor = new ApiRequestLoggingInterceptor(properties);
    MockHttpServletRequest request = new MockHttpServletRequest("GET", "/test");
    MockHttpServletResponse response = new MockHttpServletResponse();
    response.setStatus(500);
    request.setAttribute(ApiRequestLoggingInterceptor.EXCEPTION_LOGGED_ATTRIBUTE, Boolean.TRUE);
    ListAppender<ILoggingEvent> appender = appender();

    interceptor.preHandle(request, response, new Object());
    interceptor.afterCompletion(request, response, new Object(), null);

    assertThat(appender.list).allMatch(event -> event.getLevel().isGreaterOrEqual(Level.DEBUG));
    assertThat(appender.list).noneMatch(event -> event.getLevel().isGreaterOrEqual(Level.WARN));
    detach(appender);
  }

  private ListAppender<ILoggingEvent> appender() {
    Logger logger = (Logger) LoggerFactory.getLogger(ApiRequestLoggingInterceptor.class);
    ListAppender<ILoggingEvent> appender = new ListAppender<>();
    appender.start();
    logger.addAppender(appender);
    return appender;
  }

  private void detach(ListAppender<ILoggingEvent> appender) {
    Logger logger = (Logger) LoggerFactory.getLogger(ApiRequestLoggingInterceptor.class);
    logger.detachAppender(appender);
  }
}
