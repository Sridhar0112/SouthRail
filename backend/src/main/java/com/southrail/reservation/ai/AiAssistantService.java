package com.southrail.reservation.ai;

import com.southrail.reservation.ai.dto.AiDtos;
import com.southrail.reservation.ai.gemini.GeminiClient;
import java.util.List;
import org.springframework.stereotype.Service;
import com.southrail.reservation.shared.config.properties.SouthRailFeatureProperties;

/** Application-facing AI assistant behavior, independent of the configured provider. */
@Service
public class AiAssistantService {
  private final GeminiClient geminiClient;
  private final boolean enabled;

  public AiAssistantService(GeminiClient geminiClient, SouthRailFeatureProperties features) {
    this.geminiClient = geminiClient;
    this.enabled = features.isAiEnabled();
  }

  public AiDtos.ChatResponse chat(AiDtos.ChatRequest request) {
    requireEnabled();
    return geminiClient.chat(request);
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
}
