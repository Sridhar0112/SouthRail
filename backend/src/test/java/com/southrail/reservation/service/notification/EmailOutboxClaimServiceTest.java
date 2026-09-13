package com.southrail.reservation.service.notification;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class EmailOutboxClaimServiceTest {
  @Test void claimCommitsProcessingLeaseBeforeReturningPayload() {
    EmailOutboxRepository repository = mock(EmailOutboxRepository.class);
    EmailOutboxMessage queued = new EmailOutboxMessage(); queued.setId(UUID.randomUUID());
    queued.setMimeMessage(new byte[] {1}); queued.setStatus("PENDING");
    when(repository.lockNext(any())).thenReturn(Optional.of(queued));
    Optional<EmailOutboxClaimService.ClaimedEmail> claim = new EmailOutboxClaimService(repository).claim();
    assertThat(claim).isPresent(); assertThat(queued.getStatus()).isEqualTo("PROCESSING");
    assertThat(queued.getNextAttemptAt()).isAfter(Instant.now());
  }

  @Test void deliveredPayloadIsErased() {
    EmailOutboxRepository repository = mock(EmailOutboxRepository.class);
    EmailOutboxMessage queued = new EmailOutboxMessage(); queued.setId(UUID.randomUUID());
    queued.setMimeMessage(new byte[] {1}); queued.setStatus("PROCESSING");
    when(repository.findByIdForUpdate(queued.getId())).thenReturn(Optional.of(queued));
    new EmailOutboxClaimService(repository).delivered(queued.getId());
    assertThat(queued.getStatus()).isEqualTo("DELIVERED"); assertThat(queued.getMimeMessage()).isNull();
  }
}
