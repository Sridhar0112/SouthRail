package com.southrail.reservation.shared.web.filter;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.slf4j.MDC;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import jakarta.servlet.FilterChain;

class CorrelationIdFilterTest {
  private final CorrelationIdFilter filter = new CorrelationIdFilter();

  @Test
  void reusesSafeIncomingCorrelationIdAndClearsMdc() throws Exception {
    MockHttpServletRequest request = new MockHttpServletRequest("GET", "/bookings");
    request.addHeader(CorrelationIdFilter.HEADER_NAME, "client-request-42");
    MockHttpServletResponse response = new MockHttpServletResponse();

    filter.doFilter(request, response, new MockFilterChain());

    assertThat(response.getHeader(CorrelationIdFilter.HEADER_NAME)).isEqualTo("client-request-42");
    assertThat(MDC.get(CorrelationIdFilter.MDC_KEY)).isNull();
  }

  @Test
  void replacesUnsafeIncomingCorrelationId() throws Exception {
    MockHttpServletRequest request = new MockHttpServletRequest("GET", "/bookings");
    request.addHeader(CorrelationIdFilter.HEADER_NAME, "unsafe\nheader");
    MockHttpServletResponse response = new MockHttpServletResponse();

    filter.doFilter(request, response, new MockFilterChain());

    assertThat(response.getHeader(CorrelationIdFilter.HEADER_NAME))
        .isNotBlank()
        .doesNotContain("\n");
    assertThat(MDC.get(CorrelationIdFilter.MDC_KEY)).isNull();
  }

  @Test
  void makesCorrelationIdAvailableDuringRequestAndCleansItAfterFailure() throws Exception {
    MockHttpServletRequest request = new MockHttpServletRequest("GET", "/bookings");
    MockHttpServletResponse response = new MockHttpServletResponse();
    String[] observedCorrelationId = new String[1];
    FilterChain failingChain = (servletRequest, servletResponse) -> {
      observedCorrelationId[0] = MDC.get(CorrelationIdFilter.MDC_KEY);
      throw new jakarta.servlet.ServletException("test failure");
    };

    org.assertj.core.api.Assertions.assertThatThrownBy(() -> filter.doFilter(request, response, failingChain))
        .isInstanceOf(jakarta.servlet.ServletException.class);

    assertThat(observedCorrelationId[0]).isNotBlank();
    assertThat(response.getHeader(CorrelationIdFilter.HEADER_NAME)).isEqualTo(observedCorrelationId[0]);
    assertThat(MDC.get(CorrelationIdFilter.MDC_KEY)).isNull();
  }
}
