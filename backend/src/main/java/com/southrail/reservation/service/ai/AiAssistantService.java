package com.southrail.reservation.service.ai;

import com.southrail.reservation.dto.ai.AiDtos;
import com.southrail.reservation.exception.ai.AiException;
import com.southrail.reservation.service.ai.GeminiClient;
import java.util.List;
import org.springframework.stereotype.Service;
import com.southrail.reservation.config.properties.SouthRailFeatureProperties;

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
