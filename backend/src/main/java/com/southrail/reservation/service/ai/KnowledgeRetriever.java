package com.southrail.reservation.service.ai;

import java.util.List;

public interface KnowledgeRetriever {
  List<KnowledgeChunk> retrieve(String question, boolean admin);
}
