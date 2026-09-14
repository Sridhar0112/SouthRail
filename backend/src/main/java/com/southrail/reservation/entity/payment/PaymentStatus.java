package com.southrail.reservation.entity.payment;

import java.util.EnumSet;

public enum PaymentStatus {
  CREATED, PENDING, AUTHORIZED, CAPTURED, FAILED, REFUND_PENDING, PARTIALLY_REFUNDED, REFUNDED;

  public boolean canTransitionTo(PaymentStatus next) {
    if (this == next) return true;
    return switch (this) {
      case CREATED -> next == PENDING || next == FAILED;
      case PENDING -> EnumSet.of(AUTHORIZED, CAPTURED, FAILED).contains(next);
      case AUTHORIZED -> next == CAPTURED || next == FAILED;
      case CAPTURED -> next == REFUND_PENDING;
      case REFUND_PENDING -> next == PARTIALLY_REFUNDED || next == REFUNDED;
      case PARTIALLY_REFUNDED -> next == REFUND_PENDING || next == REFUNDED;
      case FAILED, REFUNDED -> false;
    };
  }
}
