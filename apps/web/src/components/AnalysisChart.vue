<script setup lang="ts">
import { BarChart } from "echarts/charts";
import { GridComponent, LegendComponent, TooltipComponent } from "echarts/components";
import { use } from "echarts/core";
import { SVGRenderer } from "echarts/renderers";
import { computed } from "vue";
import VChart from "vue-echarts";

import type { ChartSeries, ResultRow } from "@contracts/public/analysis-run";

const props = defineProps<{
  rows: readonly ResultRow[];
  categoryField: string;
  series: readonly ChartSeries[];
}>();

use([BarChart, GridComponent, LegendComponent, TooltipComponent, SVGRenderer]);

const option = computed(() => ({
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
    data: props.rows.map((row) => row[props.categoryField]),
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
    type: "bar",
    barMaxWidth: 28,
    itemStyle: { borderRadius: [3, 3, 0, 0] },
    data: props.rows.map((row) => row[series.field]),
  })),
}));
</script>

<template>
  <VChart class="chart-canvas" :option="option" autoresize />
</template>
