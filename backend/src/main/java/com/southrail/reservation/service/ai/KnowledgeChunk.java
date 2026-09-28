package com.southrail.reservation.service.ai;

import java.util.List;

/** A bounded, classified section from an explicitly approved SouthRail document. */
public record KnowledgeChunk(
    String id,
    String source,
    String section,
    String category,
    KnowledgeAudience audience,
    String content,
    List<Double> embedding) {

  KnowledgeChunk withEmbedding(List<Double> vector) {
    return new KnowledgeChunk(id, source, section, category, audience, content, List.copyOf(vector));
  }
}
