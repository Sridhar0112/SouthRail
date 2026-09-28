package com.southrail.reservation.service.ai;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.southrail.reservation.config.properties.SouthRailFeatureProperties;
import com.southrail.reservation.dto.ai.AiDtos;
import com.southrail.reservation.exception.ai.AiException;
import java.util.Collections;
import java.util.List;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

class AiAssistantServiceTest {
  @Test
  void delegatesApplicationRequestsToTheConfiguredProvider() {
    GeminiClient provider = Mockito.mock(GeminiClient.class);
    SouthRailFeatureProperties features = new SouthRailFeatureProperties();
    features.setAiEnabled(true);
    AiDtos.ChatRequest request = new AiDtos.ChatRequest("hello", null, Double.valueOf(0.7), Integer.valueOf(100));
    AiDtos.ChatResponse response = new AiDtos.ChatResponse("answer", "gemini-test", null);
    List<AiDtos.ModelResponse> models = Collections.emptyList();
    List<KnowledgeChunk> chunks = List.of(new KnowledgeChunk(
        "chunk", "SouthRail Knowledge Base", "Waitlist > Promotion Rules", "booking",
        KnowledgeAudience.PASSENGER, "Whole parties are promoted in FIFO order.", List.of()));
    AtomicReference<KnowledgeRetrieval> retrieval = new AtomicReference<>(
        new KnowledgeRetrieval(KnowledgeClassification.KNOWLEDGE, chunks, 0.8d));
    AiAssistantService service = new AiAssistantService(provider, (question, admin) -> retrieval.get(), features);
    when(provider.chat(request)).thenReturn(response);
    when(provider.chat(request, chunks)).thenReturn(response);
    when(provider.getModels()).thenReturn(models);

    assertThat(service.chat(request)).isSameAs(response);
    assertThat(service.chat(request, null)).isSameAs(response);
    assertThat(service.getModels()).isSameAs(models);
    verify(provider).chat(request);
    verify(provider).chat(request, chunks);
    verify(provider).getModels();

    retrieval.set(new KnowledgeRetrieval(KnowledgeClassification.OUT_OF_SCOPE, List.of(), 0.1d));
    assertThat(service.chat(request, null).getResponse()).startsWith("I'm focused on SouthRail");
    retrieval.set(new KnowledgeRetrieval(KnowledgeClassification.LIVE_DATA, List.of(), 0.7d));
    assertThat(service.chat(request, null).getResponse()).contains("can't verify live SouthRail data");
    retrieval.set(new KnowledgeRetrieval(KnowledgeClassification.EXTERNAL_RAILWAY, List.of(), 0.7d));
    assertThat(service.chat(request, null).getResponse()).contains("external railway question");
    retrieval.set(new KnowledgeRetrieval(KnowledgeClassification.INSUFFICIENT_KNOWLEDGE, List.of(), 0.35d));
    assertThat(service.chat(request, null).getResponse()).contains("does not contain enough information");
    verify(provider).chat(request, chunks);
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
