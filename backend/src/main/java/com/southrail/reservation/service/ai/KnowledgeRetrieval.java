package com.southrail.reservation.service.ai;

import java.util.List;

public record KnowledgeRetrieval(
    KnowledgeClassification classification,
    List<KnowledgeChunk> chunks,
    double topSimilarity) {

  public KnowledgeRetrieval {
    chunks = chunks == null ? List.of() : List.copyOf(chunks);
  }

  public static KnowledgeRetrieval insufficient() {
    return new KnowledgeRetrieval(KnowledgeClassification.INSUFFICIENT_KNOWLEDGE, List.of(), -1d);
  }
}
