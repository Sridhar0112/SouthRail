package com.southrail.reservation.service.booking;

import com.southrail.reservation.config.properties.ReservationHoldProperties;
import com.southrail.reservation.entity.booking.ReservationHoldStatus;
import com.southrail.reservation.repository.booking.ReservationHoldRepository;
import com.southrail.reservation.service.audit.AuditLogService;
import java.time.Instant;
import java.util.UUID;
import org.springframework.data.domain.PageRequest;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Component
public class ReservationHoldExpiryProcessor {
  private final ReservationHoldRepository holds;
  private final ReservationHoldProperties config;
  private final AuditLogService audit;
  public ReservationHoldExpiryProcessor(ReservationHoldRepository holds, ReservationHoldProperties config, AuditLogService audit) {
    this.holds = holds; this.config = config; this.audit = audit;
  }
  @Scheduled(fixedDelayString = "${southrail.reservation-hold.expiry-delay:PT15S}")
  @Transactional
  public void expire() {
    holds.findExpiredCandidates(Instant.now(), PageRequest.of(0, config.batchSize())).forEach(this::expireOne);
  }
  public void expireOne(UUID id) {
    holds.findByIdForUpdate(id).ifPresent(hold -> {
      if (hold.getStatus() == ReservationHoldStatus.ACTIVE && !Instant.now().isBefore(hold.getExpiresAt())) {
        hold.setStatus(ReservationHoldStatus.EXPIRED);
        audit.log(hold.getUser().getId(), hold.getUser().getEmail(), "RESERVATION_HOLD_EXPIRED", "BOOKING", "Reservation hold " + id + " expired; inventory released");
      }
    });
  }
}
