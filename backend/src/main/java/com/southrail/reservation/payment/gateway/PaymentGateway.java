package com.southrail.reservation.payment.gateway;

import java.util.Map;

public interface PaymentGateway {
  record GatewayOrder(String id, long amount, String currency, String status) {}

  record GatewayPayment(String id, String orderId, long amount, String currency, String status) {}

  record GatewayRefund(String id, long amount, String status) {}

  GatewayOrder createOrder(long amount, String currency, String receipt, Map<String, String> notes);

  GatewayPayment fetchPayment(String paymentId);

  GatewayRefund initiateRefund(String paymentId, long amount, String idempotencyKey);
}
