package com.biagent.core.contracts;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.JsonNode;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.time.Instant;

/**
 * Java、Python 和 Web 之间传递的统一事件信封。
 *
 * <p>事件类型决定 payload 的业务含义；payload 暂时保留为 JSON，
 * 等具体事件需要被 Java 处理时再转换成对应 DTO。</p>
 *
 * @param runId       分析运行标识
 * @param sequence    同一运行内的递增事件序号
 * @param occurredAt  事件发生时间
 * @param eventType   事件类型
 * @param payload     事件的具体内容
 */
public record AgentEvent(
        @JsonProperty("run_id") @NotBlank String runId,
        @Positive int sequence,
        @JsonProperty("occurred_at") @NotNull Instant occurredAt,
        @JsonProperty("event_type") @NotNull EventType eventType,
        @NotNull JsonNode payload
) {
}
