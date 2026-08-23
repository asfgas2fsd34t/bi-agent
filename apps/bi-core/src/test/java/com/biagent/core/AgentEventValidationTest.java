package com.biagent.core;

import com.biagent.core.contracts.AgentEvent;
import com.biagent.core.contracts.EventType;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import org.junit.jupiter.api.Test;

import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;

class AgentEventValidationTest {
    private final Validator validator = Validation.buildDefaultValidatorFactory().getValidator();
    private final ObjectMapper mapper = new ObjectMapper();

    @Test
    void rejectsInvalidEventEnvelope() {
        AgentEvent event = new AgentEvent(
                "",
                0,
                null,
                EventType.STATUS,
                mapper.createObjectNode()
        );

        assertThat(validator.validate(event)).isNotEmpty();
    }

    @Test
    void acceptsSharedStatusFixtureShape() {
        AgentEvent event = new AgentEvent(
                "run-demo-001",
                1,
                Instant.parse("2026-08-23T08:00:01Z"),
                EventType.STATUS,
                mapper.createObjectNode()
                        .put("status", "running")
                        .put("label", "正在分析")
                        .put("detail", "Python Agent 已提交候选事件")
        );

        assertThat(validator.validate(event)).isEmpty();
    }
}
