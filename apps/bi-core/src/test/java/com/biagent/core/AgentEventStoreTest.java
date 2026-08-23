package com.biagent.core;

import com.biagent.core.contracts.AgentEvent;
import com.biagent.core.contracts.EventType;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.biagent.core.store.AgentEventStore;
import org.junit.jupiter.api.Test;

import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;

class AgentEventStoreTest {
    private final ObjectMapper mapper = new ObjectMapper();

    @Test
    void keepsEventsOrderedAndIdempotentBySequence() {
        AgentEventStore store = new AgentEventStore();
        AgentEvent first = event(1);
        AgentEvent duplicate = event(1);
        AgentEvent second = event(2);

        store.append(second);
        store.append(first);
        store.append(duplicate);

        assertThat(store.findByRunId("run-1")).containsExactly(first, second);
    }

    private AgentEvent event(int sequence) {
        return new AgentEvent(
                "run-1",
                sequence,
                Instant.parse("2026-08-23T08:00:00Z"),
                EventType.STATUS,
                mapper.createObjectNode().put("status", "running").put("label", "正在分析")
        );
    }
}
