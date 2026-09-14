package com.southrail.reservation.payment.service;

import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.MessageDigest;
import java.util.HexFormat;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

public final class RazorpaySignatures {
  private RazorpaySignatures() {}

  public static boolean verify(String body, String signature, String secret) {
    if (secret == null || secret.isBlank() || signature == null) {
      return false;
    }
    try {
      Mac mac = Mac.getInstance("HmacSHA256");
      mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
      byte[] expected = mac.doFinal(body.getBytes(StandardCharsets.UTF_8));
      byte[] supplied = HexFormat.of().parseHex(signature);
      return MessageDigest.isEqual(expected, supplied);
    } catch (GeneralSecurityException | IllegalArgumentException exception) {
      return false;
    }
  }
}
