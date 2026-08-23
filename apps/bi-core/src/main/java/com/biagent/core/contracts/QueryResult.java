package com.biagent.core.contracts;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.List;
import java.util.Map;

/**
 * 数据查询返回的表格结果。
 *
 * @param columns  列名列表
 * @param rows     行数据，键为列名
 * @param truncated 是否因为限制而截断结果
 */
public record QueryResult(
        @NotNull List<@NotBlank String> columns,
        @NotNull List<@NotNull Map<String, Object>> rows,
        boolean truncated
) {
}
