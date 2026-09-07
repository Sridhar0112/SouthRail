package com.southrail.reservation.ai;

import com.southrail.reservation.ai.dto.AiDtos;
import com.southrail.reservation.ai.gemini.GeminiClient;
import java.util.List;
import org.springframework.stereotype.Service;

/** Application-facing AI assistant behavior, independent of the configured provider. */
@Service
public class AiAssistantService {
  private final GeminiClient geminiClient;

  public AiAssistantService(GeminiClient geminiClient) {
    this.geminiClient = geminiClient;
  }

  public AiDtos.ChatResponse chat(AiDtos.ChatRequest request) {
    return geminiClient.chat(request);
  }

  public List<AiDtos.ModelResponse> getModels() {
    return geminiClient.getModels();
  }
}
