package com.southrail.reservation.entity.payment;

public enum RefundStatus {
  REQUESTED, PROCESSING, PROCESSED, FAILED;

  public boolean canTransitionTo(RefundStatus next) {
    return this == next || switch (this) {
      case REQUESTED -> next == PROCESSING || next == FAILED;
      case PROCESSING -> next == PROCESSED || next == FAILED;
      case FAILED -> next == PROCESSING;
      case PROCESSED -> false;
    };
  }
}
