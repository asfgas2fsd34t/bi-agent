package com.biagent.core.contracts;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;

/**
 * 从查询结果确定性推导出的、可以回算的事实集合。
 *
 * @param facts 经过校验的事实
 * @param asOf 事实对应的数据时间
 */
public record VerifiedFacts(
        @NotNull @Size(min = 1) List<@NotNull @Valid VerifiedFact> facts,
        @NotNull OffsetDateTime asOf
) {
    /**
     * 一个带稳定标识和可选展示信息的事实。
     *
     * @param key            事实的稳定标识
     * @param label          面向用户的名称
     * @param value          事实值
     * @param formattedValue 可选的展示值
     * @param unit           可选的单位
     * @param change         可选的变化值
     * @param attributes     可选的附加属性
     */
    public record VerifiedFact(
            @NotBlank String key,
            @NotBlank String label,
            Object value,
            String formattedValue,
            String unit,
            Double change,
            Map<String, Object> attributes
    ) {
    }
}
