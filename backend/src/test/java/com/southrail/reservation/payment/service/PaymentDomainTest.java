package com.southrail.reservation.payment.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.southrail.reservation.entity.payment.PaymentStatus;
import com.southrail.reservation.entity.payment.RefundStatus;
import java.math.BigDecimal;
import org.junit.jupiter.api.Test;

class PaymentDomainTest {
  @Test
  void convertsRupeesToPaiseExactly() {
    assertThat(PaymentService.toMinorUnits(new BigDecimal("1234.00"))).isEqualTo(123400);
    assertThatThrownBy(() -> PaymentService.toMinorUnits(new BigDecimal("1.001")))
        .isInstanceOf(IllegalArgumentException.class);
  }

  @Test
  void rejectsTerminalAndReverseTransitions() {
    assertThat(PaymentStatus.CREATED.canTransitionTo(PaymentStatus.PENDING)).isTrue();
    assertThat(PaymentStatus.REFUNDED.canTransitionTo(PaymentStatus.CAPTURED)).isFalse();
    assertThat(RefundStatus.PROCESSED.canTransitionTo(RefundStatus.PROCESSING)).isFalse();
  }
}
