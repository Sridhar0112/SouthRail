package com.southrail.reservation.controller.ai;

import com.southrail.reservation.dto.ai.AiDtos;
import com.southrail.reservation.service.ai.AiAssistantService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/chat")
@RequiredArgsConstructor
public class AiController {

    private final AiAssistantService aiAssistantService;

    @PostMapping
    public AiDtos.ChatResponse chat(
            @Valid @RequestBody AiDtos.ChatRequest request) {

        return aiAssistantService.chat(request);
    }

    @GetMapping("/models")
    public List<AiDtos.ModelResponse> getModels() {

        return aiAssistantService.getModels();
    }
}
