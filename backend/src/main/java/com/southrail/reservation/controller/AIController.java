package com.southrail.reservation.controller;

import com.southrail.reservation.dto.AIDtos;
import com.southrail.reservation.service.GeminiChatService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/chat")
@RequiredArgsConstructor
public class AIController {

    private final GeminiChatService geminiService;

    @PostMapping
    public AIDtos.ChatResponse chat(
            @RequestBody AIDtos.ChatRequest request) {

        return geminiService.chat(request);
    }

    @GetMapping("/models")
    public List<AIDtos.ModelResponse> getModels() {

        return geminiService.getModels();
    }
}
