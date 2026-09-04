package com.southrail.reservation.web;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.slf4j.MDC;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

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
}
