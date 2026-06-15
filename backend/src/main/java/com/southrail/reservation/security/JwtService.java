package com.southrail.reservation.security;

import com.southrail.reservation.entity.User;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;
import java.util.stream.Collectors;
import javax.crypto.SecretKey;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class JwtService {
  private final SecretKey key;
  private final String issuer;
  private final long accessMinutes;

  public JwtService(
      @Value("${app.jwt.secret}") String secret,
      @Value("${app.jwt.issuer}") String issuer,
      @Value("${app.jwt.access-token-minutes}") long accessMinutes) {
    this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
    this.issuer = issuer;
    this.accessMinutes = accessMinutes;
  }

  public String createAccessToken(User user) {
    Instant now = Instant.now();
    Map<String, Object> claims = new HashMap<>();
    claims.put("roles", user.getRoles().stream().map(Enum::name).collect(Collectors.toList()));
    claims.put("uid", user.getId().toString());
    return Jwts.builder()
        .issuer(issuer)
        .subject(user.getEmail())
        .claims(claims)
        .issuedAt(Date.from(now))
        .expiration(Date.from(now.plusSeconds(accessMinutes * 60)))
        .signWith(key)
        .compact();
  }

  public String subject(String token) {
    return Jwts.parser().verifyWith(key).build().parseSignedClaims(token).getPayload().getSubject();
  }
}
