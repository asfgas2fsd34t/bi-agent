package com.biagent.core.contracts;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.List;

/**
 * Agent 从自然语言问题中提取出的结构化查询意图。
 *
 * @param metric     要分析的指标
 * @param dimensions 分析维度
 * @param timeRange  时间范围
 * @param comparison 对比方式
 * @param limit      返回结果条数上限
 */
public record SemanticQuery(
        @NotBlank String metric,
        @NotNull List<@NotBlank String> dimensions,
        @JsonProperty("timeRange") @NotBlank String timeRange,
        @NotBlank String comparison,
        @Min(1) @Max(1000) int limit
) {
}
