package com.biagent.core.contracts;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;

import java.util.List;

/** 相对于当前 SemanticQuery 的结构化查询变更。 */
public record QueryPatch(
        String metric,
        List<String> dimensions,
        @JsonProperty("timeRange") String timeRange,
        String comparison,
        @Min(1) @Max(1000) Integer limit,
        List<@Valid QueryFilter> filters
) {
}
