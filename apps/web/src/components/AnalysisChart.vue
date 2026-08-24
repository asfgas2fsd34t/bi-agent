<script setup lang="ts">
import { BarChart, LineChart, PieChart } from "echarts/charts";
import { GridComponent, LegendComponent, TooltipComponent } from "echarts/components";
import { use } from "echarts/core";
import { SVGRenderer } from "echarts/renderers";
import { computed } from "vue";
import VChart from "vue-echarts";

import type { ChartIntent, ChartSeries, ResultRow } from "@contracts/typescript/analysis-run";

const props = defineProps<{
  rows: readonly ResultRow[];
  kind: ChartIntent["kind"];
  categoryField: string;
  categoryFields: readonly string[];
  series: readonly ChartSeries[];
}>();

use([BarChart, LineChart, PieChart, GridComponent, LegendComponent, TooltipComponent, SVGRenderer]);

const option = computed(() => {
  const categoryFields = props.categoryFields.length ? props.categoryFields : [props.categoryField];
  const categoryLabel = (row: ResultRow) => categoryFields.map((field) => String(row[field] ?? "")).filter(Boolean).join(" · ");
  const categories = props.rows.map(categoryLabel);

  if (props.kind === "pie") {
    const firstSeries = props.series[0];
    return {
      animationDuration: 380,
      tooltip: { trigger: "item", valueFormatter: (value: number) => `¥${value.toFixed(2)}M` },
      legend: { bottom: 0, textStyle: { color: "#66716b", fontSize: 11 } },
      series: [{
        name: firstSeries?.name ?? "值",
        type: "pie",
        radius: "60%",
        data: props.rows.map((row) => ({ name: categoryLabel(row), value: firstSeries ? row[firstSeries.field] : 0 })),
      }],
    };
  }

  const lineLike = props.kind === "line" || props.kind === "area";
  return {
    animationDuration: 380,
    color: ["#15724f", "#a9b7ae"],
    grid: { left: 12, right: 12, top: 42, bottom: 8, containLabel: true },
    legend: { top: 0, right: 0, itemWidth: 10, itemHeight: 10, textStyle: { color: "#66716b", fontSize: 11 } },
    tooltip: {
      trigger: "axis",
      valueFormatter: (value: number) => `¥${value.toFixed(2)}M`,
    },
    xAxis: {
      type: "category",
      data: categories,
      axisTick: { show: false },
      axisLine: { lineStyle: { color: "#d9dfda" } },
      axisLabel: { color: "#66716b", fontSize: 11 },
    },
    yAxis: {
      type: "value",
      name: "百万元",
      nameTextStyle: { color: "#8a938e", fontSize: 10, align: "left" },
      splitLine: { lineStyle: { color: "#edf0ed" } },
      axisLabel: { color: "#7b857f", fontSize: 10 },
    },
    series: props.series.map((series) => ({
      name: series.name,
      type: lineLike ? "line" : "bar",
      ...(lineLike && props.kind === "area" ? { areaStyle: {} } : {}),
      ...(!lineLike ? { barMaxWidth: 28, itemStyle: { borderRadius: [3, 3, 0, 0] } } : {}),
      data: props.rows.map((row) => row[series.field]),
    })),
  };
});
</script>

<template>
  <VChart class="chart-canvas" :option="option" autoresize />
</template>
