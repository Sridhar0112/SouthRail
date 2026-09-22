package com.southrail.reservation.service.ai;

import com.southrail.reservation.config.properties.SouthRailFeatureProperties;
import com.southrail.reservation.dto.ai.AiDtos;
import com.southrail.reservation.exception.ai.AiException;
import java.util.List;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;

/** Application-facing AI assistant behavior, independent of the configured provider. */
@Service
public class AiAssistantService {
  private static final Logger log = LoggerFactory.getLogger(AiAssistantService.class);
  private final GeminiClient geminiClient;
  private final KnowledgeRetriever knowledgeRetriever;
  private final boolean enabled;

  @Autowired
  public AiAssistantService(GeminiClient geminiClient, KnowledgeRetriever knowledgeRetriever,
      SouthRailFeatureProperties features) {
    this(geminiClient, features, knowledgeRetriever);
  }

  // Retains the narrow constructor used by provider-focused unit tests and non-Spring callers.
  public AiAssistantService(GeminiClient geminiClient, SouthRailFeatureProperties features) {
    this(geminiClient, features, (question, admin) -> List.of());
  }

  private AiAssistantService(GeminiClient geminiClient, SouthRailFeatureProperties features,
      KnowledgeRetriever knowledgeRetriever) {
    this.geminiClient = geminiClient;
    this.knowledgeRetriever = knowledgeRetriever;
    this.enabled = features.isAiEnabled();
  }

  public AiDtos.ChatResponse chat(AiDtos.ChatRequest request) {
    return chat(request, null);
  }

  public AiDtos.ChatResponse chat(AiDtos.ChatRequest request, Authentication authentication) {
    requireEnabled();
    long started = System.nanoTime();
    boolean admin = authentication != null && authentication.getAuthorities().stream()
        .anyMatch(authority -> "ROLE_ADMIN".equals(authority.getAuthority()));
    List<KnowledgeChunk> chunks = knowledgeRetriever.retrieve(request.getMessage(), admin);
    String model = request.getModel() == null || request.getModel().isBlank() ? "default" : request.getModel();
    log.info("event=AI_RAG_RETRIEVAL retrievedChunkCount={} sourceNames={} retrievalDurationMs={} model={}",
        chunks.size(), sourceNames(chunks), (System.nanoTime() - started) / 1_000_000L, model);

    AiDtos.ChatResponse response = chunks.isEmpty()
        ? geminiClient.chat(request)
        : geminiClient.chat(request, chunks);
    response.setSources(sourceReferences(chunks));
    return response;
  }

  public List<AiDtos.ModelResponse> getModels() {
    requireEnabled();
    return geminiClient.getModels();
  }

  private void requireEnabled() {
    if (!enabled) {
      throw new AiException("AI assistant is disabled");
    }
  }

  private String sourceNames(List<KnowledgeChunk> chunks) {
    return chunks.stream().map(KnowledgeChunk::source).distinct().sorted().collect(Collectors.joining(","));
  }

  private List<AiDtos.SourceReference> sourceReferences(List<KnowledgeChunk> chunks) {
    Map<String, AiDtos.SourceReference> unique = new LinkedHashMap<>();
    for (KnowledgeChunk chunk : chunks) {
      String key = chunk.source() + "\n" + chunk.section();
      unique.putIfAbsent(key, new AiDtos.SourceReference(chunk.source(), chunk.section()));
    }
    return List.copyOf(unique.values());
  }
}
