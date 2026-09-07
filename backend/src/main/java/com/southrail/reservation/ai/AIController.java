package com.southrail.reservation.ai;

import com.southrail.reservation.ai.dto.AIDtos;
import com.southrail.reservation.ai.gemini.GeminiChatService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/chat")
@RequiredArgsConstructor
public class AIController {

    private final GeminiChatService geminiService;

    @PostMapping
    public AIDtos.ChatResponse chat(
            @Valid @RequestBody AIDtos.ChatRequest request) {

        return geminiService.chat(request);
    }

    @GetMapping("/models")
    public List<AIDtos.ModelResponse> getModels() {

        return geminiService.getModels();
    }
}
