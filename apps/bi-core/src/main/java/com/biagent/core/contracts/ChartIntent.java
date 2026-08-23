package com.biagent.core.contracts;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;

/**
 * 描述前端应该如何根据查询结果生成图表。
 *
 * @param kind          图表类型
 * @param categoryField 分类字段
 * @param series        图表序列
 */
public record ChartIntent(
        @NotBlank String kind,
        @JsonProperty("categoryField") @NotBlank String categoryField,
        @NotNull @Size(min = 1) List<@Valid ChartSeries> series
) {
    /** 图表中一个数据序列的名称和字段映射。 */
    public record ChartSeries(@NotBlank String name, @NotBlank String field) {
    }
}
