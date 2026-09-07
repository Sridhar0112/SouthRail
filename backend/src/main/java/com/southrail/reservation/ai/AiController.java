package com.southrail.reservation.ai;

import com.southrail.reservation.ai.dto.AiDtos;
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
