package com.southrail.reservation.controller.ai;

import com.southrail.reservation.dto.ai.AiDtos;
import com.southrail.reservation.service.ai.AiAssistantService;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.security.core.Authentication;

@RestController
@RequestMapping("/chat")
@RequiredArgsConstructor
public class AiController {

    private final AiAssistantService aiAssistantService;

    @PostMapping
    public AiDtos.ChatResponse chat(
            @Valid @RequestBody AiDtos.ChatRequest request,
            Authentication authentication) {

        return aiAssistantService.chat(request, authentication);
    }

    @GetMapping("/models")
    public List<AiDtos.ModelResponse> getModels() {

        return aiAssistantService.getModels();
    }
}
