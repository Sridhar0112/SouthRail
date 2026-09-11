package com.southrail.reservation.ai;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.southrail.reservation.ai.dto.AiDtos;
import com.southrail.reservation.ai.gemini.GeminiClient;
import java.util.Collections;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import com.southrail.reservation.shared.config.properties.SouthRailFeatureProperties;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.never;

class AiAssistantServiceTest {
  @Test
  void delegatesApplicationRequestsToTheConfiguredProvider() {
    GeminiClient provider = Mockito.mock(GeminiClient.class);
    SouthRailFeatureProperties features = new SouthRailFeatureProperties();
    features.setAiEnabled(true);
    AiAssistantService service = new AiAssistantService(provider, features);
    AiDtos.ChatRequest request = new AiDtos.ChatRequest("hello", null, Double.valueOf(0.7), Integer.valueOf(100));
    AiDtos.ChatResponse response = new AiDtos.ChatResponse("answer", "gemini-test", null);
    List<AiDtos.ModelResponse> models = Collections.emptyList();
    when(provider.chat(request)).thenReturn(response);
    when(provider.getModels()).thenReturn(models);

    assertThat(service.chat(request)).isSameAs(response);
    assertThat(service.getModels()).isSameAs(models);
    verify(provider).chat(request);
    verify(provider).getModels();
  }

  @Test
  void disabledAiNeverCallsProvider() {
    GeminiClient provider = Mockito.mock(GeminiClient.class);
    SouthRailFeatureProperties features = new SouthRailFeatureProperties();
    features.setAiEnabled(false);
    AiAssistantService service = new AiAssistantService(provider, features);

    assertThatThrownBy(() -> service.chat(new AiDtos.ChatRequest("hello", null, 0.7, 100)))
        .isInstanceOf(AiException.class);
    verify(provider, never()).chat(Mockito.any());
  }
}
