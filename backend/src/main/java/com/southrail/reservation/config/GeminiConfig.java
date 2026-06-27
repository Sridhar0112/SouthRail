package com.southrail.reservation.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestClient;

@Data
@Configuration
@ConfigurationProperties(prefix = "gemini")
public class GeminiConfig {

    private String apiKey;

    private String baseUrl;

    private String defaultModel;

    @Bean
    public RestClient restClient() {
        return RestClient.builder()
                .build();
    }


}