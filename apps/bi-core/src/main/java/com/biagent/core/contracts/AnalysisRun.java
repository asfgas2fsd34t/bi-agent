package com.biagent.core.contracts;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.time.Instant;

/**
 * 一次分析运行的基础状态和时间信息。
 *
 * @param runId          分析运行标识
 * @param workspaceId    所属工作区标识
 * @param status         当前运行状态
 * @param question       用户原始问题
 * @param semanticVersion 使用的语义模型版本
 * @param createdAt      创建时间
 * @param updatedAt      最近更新时间
 */
public record AnalysisRun(
        @JsonProperty("run_id") String runId,
        @JsonProperty("workspace_id") String workspaceId,
        AnalysisRunStatus status,
        String question,
        @JsonProperty("semantic_version") String semanticVersion,
        @JsonProperty("created_at") Instant createdAt,
        @JsonProperty("updated_at") Instant updatedAt
) {
}
