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
  private static final String OUT_OF_SCOPE = "I'm focused on SouthRail travel and reservation assistance. "
      + "Please ask me about trains, bookings, PNR, payments, cancellations, RAC, waitlist, or other SouthRail features.";
  private static final String EXTERNAL_RAILWAY = "SouthRail Copilot is grounded in SouthRail information. "
      + "I don't have verified SouthRail documentation for that external railway question. "
      + "Please ask about a SouthRail feature or consult the railway operator's official source.";
  private static final String LIVE_DATA = "I can't verify live SouthRail data in chat. Please use the relevant "
      + "SouthRail train search, PNR, booking, payment, or account screen for the current information.";
  private static final String INSUFFICIENT = "The available SouthRail knowledge does not contain enough "
      + "information to answer that reliably. Please use the relevant SouthRail feature or contact support.";
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
    this(geminiClient, features, (question, admin) -> KnowledgeRetrieval.insufficient());
  }

  private AiAssistantService(GeminiClient geminiClient, SouthRailFeatureProperties features,
      KnowledgeRetriever knowledgeRetriever) {
    this.geminiClient = geminiClient;
    this.knowledgeRetriever = knowledgeRetriever;
    this.enabled = features.isAiEnabled();
  }

  public AiDtos.ChatResponse chat(AiDtos.ChatRequest request) {
    requireEnabled();
    return geminiClient.chat(request);
  }

  public AiDtos.ChatResponse chat(AiDtos.ChatRequest request, Authentication authentication) {
    requireEnabled();
    long started = System.nanoTime();
    boolean admin = authentication != null && authentication.getAuthorities().stream()
        .anyMatch(authority -> "ROLE_ADMIN".equals(authority.getAuthority()));
    KnowledgeRetrieval retrieval = knowledgeRetriever.retrieve(request.getMessage(), admin);
    List<KnowledgeChunk> chunks = retrieval.chunks();
    String model = request.getModel() == null || request.getModel().isBlank() ? "default" : request.getModel();
    log.info("event=AI_RAG_QUERY classification={} retrievedChunkCount={} sourceSections={} "
            + "topSimilarity={} retrievalDurationMs={} generationModel={}",
        retrieval.classification(), chunks.size(), sourceSections(chunks),
        String.format(java.util.Locale.ROOT, "%.4f", retrieval.topSimilarity()),
        (System.nanoTime() - started) / 1_000_000L, model);

    AiDtos.ChatResponse response = retrieval.classification() == KnowledgeClassification.KNOWLEDGE
        ? geminiClient.chat(request, chunks)
        : staticResponse(request, retrieval.classification());
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

  private String sourceSections(List<KnowledgeChunk> chunks) {
    return chunks.stream().map(KnowledgeChunk::section).distinct().sorted().collect(Collectors.joining("|"));
  }

  private AiDtos.ChatResponse staticResponse(AiDtos.ChatRequest request, KnowledgeClassification classification) {
    String content = switch (classification) {
      case LIVE_DATA -> LIVE_DATA;
      case EXTERNAL_RAILWAY -> EXTERNAL_RAILWAY;
      case OUT_OF_SCOPE -> OUT_OF_SCOPE;
      case INSUFFICIENT_KNOWLEDGE -> INSUFFICIENT;
      case KNOWLEDGE -> throw new IllegalStateException("Knowledge responses require retrieved context");
    };
    return new AiDtos.ChatResponse(content, request.getModel(), null, List.of());
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
