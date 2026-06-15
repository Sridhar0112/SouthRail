package com.southrail.reservation.dto;

import java.time.Instant;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

public final class NotificationDtos {
  private NotificationDtos() {}

  @Getter
  @Setter
  @NoArgsConstructor
  @AllArgsConstructor
  public static class NotificationView {
    private String id;
    private String channel;
    private String title;
    private String message;
    private boolean read;
    private Instant createdAt;
  }
}
