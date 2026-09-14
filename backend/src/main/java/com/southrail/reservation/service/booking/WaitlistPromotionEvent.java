package com.southrail.reservation.service.booking;

import java.util.UUID;

/** Published inside the promotion transaction and delivered only after commit. */
public record WaitlistPromotionEvent(
    UUID userId, String pnr, String previousStatus, String seatNumber) {}
