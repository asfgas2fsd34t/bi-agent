export type MetricId = "net_revenue" | "gmv" | "recognized_revenue";
export type DimensionId = "channel" | "region" | "category";
export type TimeRangeId = "previous_month" | "year_to_date" | "last_30_days";
export type ComparisonId = "year_over_year" | "month_over_month" | "none";

export const fixtureMetricLabels: Record<MetricId, string> = {
  net_revenue: "净收入",
  gmv: "GMV",
  recognized_revenue: "已确认收入",
};

export const fixtureTimeRangeLabels: Record<TimeRangeId, string> = {
  previous_month: "2026 年 7 月",
  year_to_date: "2026 年 1-8 月",
  last_30_days: "最近 30 天",
};

export const fixtureComparisonLabels: Record<ComparisonId, string> = {
  year_over_year: "同比",
  month_over_month: "环比",
  none: "无对比",
};

export const fixtureDimensionLabels: Record<DimensionId, string> = {
  channel: "渠道",
  region: "地区",
  category: "品类",
};
