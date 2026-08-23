package com.biagent.core.web;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.server.ResponseStatusException;

import java.time.Duration;
import java.util.Map;
import java.util.Objects;

import static org.springframework.http.HttpStatus.BAD_GATEWAY;

/**
 * Java 对外暴露的演示分析入口。
 *
 * <p>浏览器只调用 Java；Java 再通过内部客户端调用 Python Agent。</p>
 */
@RestController
@RequestMapping("/api/v1/demo")
public class DemoRunController {
    private final RestClient agentClient;

    public DemoRunController(@Value("${agent.url}") String agentUrl) {
        var requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(Duration.ofSeconds(2));
        requestFactory.setReadTimeout(Duration.ofSeconds(5));
        this.agentClient = RestClient.builder()
                .baseUrl(agentUrl)
                .requestFactory(requestFactory)
                .build();
    }

    /** 启动一次演示分析，并返回 Python Agent 创建的运行标识。 */
    @PostMapping(value = "/runs", consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    public DemoRunResponse start(@Valid @RequestBody DemoRunRequest request) {
        try {
            DemoRunResponse response = agentClient.post()
                    .uri("/v1/demo/runs")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(Map.of("question", request.question()))
                    .retrieve()
                    .body(DemoRunResponse.class);
            return Objects.requireNonNull(response, "Python Agent returned an empty response");
        } catch (RestClientException | NullPointerException error) {
            throw new ResponseStatusException(BAD_GATEWAY, "Python Agent 当前不可用", error);
        }
    }

    public record DemoRunRequest(@JsonProperty("question") @NotBlank String question) {
    }

    public record DemoRunResponse(@JsonProperty("run_id") String runId, @JsonProperty("event_count") int eventCount) {
    }
}
