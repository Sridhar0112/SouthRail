package com.southrail.reservation.payment.service;

import static org.assertj.core.api.Assertions.assertThat;

import java.nio.charset.StandardCharsets;
import java.util.HexFormat;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.junit.jupiter.api.Test;

class RazorpaySignaturesTest {
  @Test
  void acceptsValidAndRejectsInvalidSignature() throws Exception {
    String body = "order_1|pay_1";
    String secret = "test-secret";
    Mac mac = Mac.getInstance("HmacSHA256");
    mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
    String signature = HexFormat.of().formatHex(
        mac.doFinal(body.getBytes(StandardCharsets.UTF_8)));

    assertThat(RazorpaySignatures.verify(body, signature, secret)).isTrue();
    assertThat(RazorpaySignatures.verify(body, "00", secret)).isFalse();
  }
}
