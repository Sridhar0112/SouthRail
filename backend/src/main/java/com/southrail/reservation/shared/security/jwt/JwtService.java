package com.southrail.reservation.shared.security.jwt;

import com.southrail.reservation.account.User;
import com.southrail.reservation.shared.config.properties.SouthRailSecurityProperties;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;
import java.util.stream.Collectors;
import javax.crypto.SecretKey;
import org.springframework.stereotype.Service;

@Service
public class JwtService {
  private final SecretKey key;
  private final String issuer;
  private final long accessMinutes;

  public JwtService(SouthRailSecurityProperties properties) {
    this.key = Keys.hmacShaKeyFor(properties.getSecret().getBytes(StandardCharsets.UTF_8));
    this.issuer = properties.getIssuer();
    this.accessMinutes = properties.getAccessTokenMinutes();
  }

  public String createAccessToken(User user) {
    Instant now = Instant.now();
    Map<String, Object> claims = new HashMap<>();
    claims.put("roles", user.getRoles().stream().map(Enum::name).collect(Collectors.toList()));
    claims.put("uid", user.getId().toString());
    claims.put("cv", user.getCredentialsVersion());
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
    return claims(token).getSubject();
  }

  public boolean isValidFor(String token, User user) {
    io.jsonwebtoken.Claims claims = claims(token);
    Object credentialsVersionClaim = claims.get("cv");
    return user.getEmail().equalsIgnoreCase(claims.getSubject())
        && credentialsVersionClaim instanceof Number credentialsVersion
        && credentialsVersion.longValue() == user.getCredentialsVersion();
  }

  private io.jsonwebtoken.Claims claims(String token) {
    return Jwts.parser()
        .verifyWith(key)
        .requireIssuer(issuer)
        .build()
        .parseSignedClaims(token)
        .getPayload();
  }
}
