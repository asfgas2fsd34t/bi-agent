package com.biagent.core.store;

import com.biagent.core.contracts.AgentEvent;
import org.springframework.stereotype.Component;

import java.util.Comparator;
import java.util.List;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import java.util.concurrent.ConcurrentSkipListMap;

@Component
public class AgentEventStore {
    private final ConcurrentMap<String, ConcurrentSkipListMap<Integer, AgentEvent>> eventsByRun = new ConcurrentHashMap<>();

    public void append(AgentEvent event) {
        eventsByRun.computeIfAbsent(event.runId(), ignored -> new ConcurrentSkipListMap<>())
                .putIfAbsent(event.sequence(), event);
    }

    public List<AgentEvent> findByRunId(String runId) {
        return eventsByRun.getOrDefault(runId, new ConcurrentSkipListMap<>()).values().stream()
                .sorted(Comparator.comparingInt(AgentEvent::sequence))
                .toList();
    }

    public int lastSequence(String runId) {
        var events = eventsByRun.get(runId);
        return events == null || events.isEmpty() ? 0 : events.lastKey();
    }
}
