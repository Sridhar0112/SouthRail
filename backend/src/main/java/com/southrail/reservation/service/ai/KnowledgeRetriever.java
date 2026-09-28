package com.southrail.reservation.service.ai;

public interface KnowledgeRetriever {
  KnowledgeRetrieval retrieve(String question, boolean admin);
}
