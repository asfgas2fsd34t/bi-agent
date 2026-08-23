package com.biagent.core.web;

import com.biagent.core.contracts.AgentEvent;
import com.biagent.core.store.AgentEventStore;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

/**
 * 接收 Python Agent 回传的事件，并向 Web 提供指定运行的事件列表。
 */
@RestController
@RequestMapping("/api/v1")
public class AgentEventController {
    private final AgentEventStore eventStore;

    public AgentEventController(AgentEventStore eventStore) {
        this.eventStore = eventStore;
    }

    /** 接收并保存一个经过契约校验的 AgentEvent。 */
    @PostMapping("/internal/events")
    @ResponseStatus(HttpStatus.CREATED)
    public Map<String, Object> receive(@Valid @RequestBody AgentEvent event) {
        eventStore.append(event);
        return Map.of("accepted", true, "run_id", event.runId(), "sequence", event.sequence());
    }

    /** 按 sequence 顺序返回一个运行已经收到的事件。 */
    @GetMapping("/runs/{runId}/events")
    public List<AgentEvent> events(@PathVariable String runId) {
        return eventStore.findByRunId(runId);
    }
}
