import type { AgentEvent, ResultRow } from "@contracts/typescript/analysis-run";

import type { AnalysisRunSource, QueryFilter, QueryPatch } from "./analysis-run-source";
import {
  fixtureComparisonLabels,
  fixtureDimensionLabels,
  fixtureMetricLabels,
  fixtureTimeRangeLabels,
  type ComparisonId,
  type DimensionId,
  type MetricId,
  type TimeRangeId,
} from "./query-options";
export { fixtureComparisonLabels, fixtureDimensionLabels, fixtureMetricLabels, fixtureTimeRangeLabels } from "./query-options";

export type FixtureScenarioId =
  | "loading"
  | "streaming"
  | "clarification"
  | "success"
  | "empty"
  | "truncated"
  | "compile_failed"
  | "denied"
  | "failed"
  | "cancelled"
  | "recovered";

interface FixtureQuery {
  metric: MetricId;
  dimensions: DimensionId[];
  timeRange: TimeRangeId;
  comparison: ComparisonId;
  limit: number;
  filters: QueryFilter[];
}

export interface FixtureScenario {
  id: FixtureScenarioId;
  label: string;
  description: string;
}

interface FixtureRow {
  channel: string;
  region: string;
  category: string;
  current: number;
  previous: number;
}

export const fixtureScenarios: FixtureScenario[] = [
  { id: "loading", label: "加载", description: "运行已创建，正在准备语义上下文" },
  { id: "streaming", label: "流式", description: "typed events 正在持续抵达" },
  { id: "clarification", label: "澄清", description: "业务术语存在多个已发布口径" },
  { id: "success", label: "成功", description: "完整图表、数据与证据化洞察" },
  { id: "empty", label: "空结果", description: "查询成功，但时间范围内没有数据" },
  { id: "truncated", label: "截断", description: "结果超过预算，保留可核查的部分结果" },
  { id: "compile_failed", label: "编译失败", description: "SemanticQuery 无法编译为安全查询" },
  { id: "denied", label: "拒绝", description: "权限策略拒绝访问敏感指标" },
  { id: "failed", label: "失败", description: "执行失败并返回可行动错误" },
  { id: "cancelled", label: "取消", description: "用户终止了运行" },
  { id: "recovered", label: "恢复", description: "断线后从事件序号恢复" },
];

const runId = "run-fixture-184";
const occurredAt = "2026-08-23T07:30:00.000Z";
const defaultQuery: FixtureQuery = {
  metric: "net_revenue",
  dimensions: ["channel"],
  timeRange: "previous_month",
  comparison: "year_over_year",
  limit: 10,
  filters: [],
};
const metricMultipliers: Record<MetricId, number> = {
  net_revenue: 1,
  gmv: 1.18,
  recognized_revenue: 0.88,
};
const timeRangeFactors: Record<TimeRangeId, { current: number; previous: number }> = {
  previous_month: { current: 1, previous: 1 },
  year_to_date: { current: 1.32, previous: 1.24 },
  last_30_days: { current: 0.74, previous: 0.7 },
};
const comparisonFactors: Record<ComparisonId, { current: number; previous: number }> = {
  year_over_year: { current: 1, previous: 1 },
  month_over_month: { current: 1, previous: 0.92 },
  none: { current: 1, previous: 0 },
};
const fixtureRows: FixtureRow[] = [
  { channel: "抖音", region: "华东", category: "直播电商", current: 4.82, previous: 4.06 },
  { channel: "淘宝", region: "华东", category: "货架电商", current: 3.46, previous: 3.08 },
  { channel: "京东", region: "华北", category: "货架电商", current: 2.66, previous: 2.49 },
  { channel: "小红书", region: "华南", category: "内容电商", current: 1.1, previous: 0.86 },
  { channel: "官网", region: "华东", category: "自营电商", current: 0.44, previous: 0.5 },
];

function successEvents(query: FixtureQuery, truncated = false): AgentEvent[] {
  const rows = queryRows(query);
  const metricLabel = fixtureMetricLabels[query.metric];
  const comparisonLabel = fixtureComparisonLabels[query.comparison] ?? query.comparison;
  const timeRangeLabel = fixtureTimeRangeLabels[query.timeRange] ?? query.timeRange;
  const categoryField = query.dimensions[0] ?? "channel";
  const totalCurrent = rows.reduce((sum, row) => sum + numberValue(row, "current"), 0);
  const totalPrevious = rows.reduce((sum, row) => sum + numberValue(row, "previous"), 0);
  const totalChange = totalPrevious === 0 ? undefined : round(((totalCurrent - totalPrevious) / totalPrevious) * 100);
  const leader = rows[0];
  const series = query.comparison === "none"
    ? [{ name: timeRangeLabel, field: "current" }]
    : [
        { name: `${timeRangeLabel}当前`, field: "current" },
        { name: `${comparisonLabel}对比`, field: "previous" },
      ];

  return [
    event(1, "status", { status: "queued", label: "已收到问题", detail: "正在恢复工作区权限与语义版本" }),
    event(2, "status", { status: "running", label: "正在理解分析意图", detail: "识别指标、时间范围和比较方式" }),
    event(3, "status", { status: "running", label: "正在检索语义上下文", detail: "已载入 ecommerce@3" }),
    event(4, "semantic_query", {
      metric: query.metric,
      dimensions: [...query.dimensions],
      timeRange: query.timeRange,
      comparison: query.comparison,
      limit: query.limit,
    }),
    event(5, "status", { status: "running", label: "正在校验并编译查询", detail: "仅使用已发布语义成员" }),
    event(6, "sql", {
      dialect: "postgresql",
      statement: compileSql(query),
    }),
    event(7, "status", { status: "running", label: "正在执行查询", detail: "查询通过权限与预算校验" }),
    event(8, "data", {
      columns: queryColumns(query),
      rows,
      truncated,
    }),
    event(9, "verified_facts", {
      facts: [
        { key: query.metric, label: metricLabel, value: round(totalCurrent), formattedValue: `¥${totalCurrent.toFixed(2)}M`, unit: "CNY", change: totalChange, attributes: {} },
        { key: "top_channel", label: query.dimensions[0] === "channel" ? "领先渠道" : "领先项", value: leader ? leader[categoryField] ?? null : null, formattedValue: leader ? `¥${numberValue(leader, "current").toFixed(2)}M` : "—", unit: "CNY", attributes: leader ? { share: round((numberValue(leader, "current") / Math.max(totalCurrent, 1)) * 100) } : {} },
        { key: "data_freshness", label: "数据新鲜度", value: "2026-08-01T08:30:00+08:00", formattedValue: "08:30", attributes: { date: "2026-08-01" } },
      ],
      asOf: "2026-08-01T08:30:00+08:00",
    }),
    event(10, "chart", { kind: "bar", categoryField, series }),
    event(11, "status", { status: "running", label: "正在生成洞察", detail: "基于 VerifiedFacts 组织可核查解释" }),
    event(12, "insight", {
      claim: leader
        ? `${String(leader[categoryField])}${metricLabel} ¥${numberValue(leader, "current").toFixed(2)}M，排名第一${comparisonLabel === "无对比" ? "" : `，${comparisonLabel} ${formatChange(leader)}。`}`
        : `当前筛选条件下没有可用的${metricLabel}结果。`,
      evidence: `data.rows[${categoryField}=${leader ? String(leader[categoryField]) : "none"}]`,
    }),
    event(13, "status", { status: "completed", label: "分析完成", detail: truncated ? "结果已截断，仍保留可核查数据" : "13 个事件已验证" }),
  ];
}

function scenarioEvents(scenarioId: FixtureScenarioId, query: FixtureQuery): AgentEvent[] {
  const success = successEvents(query);
  switch (scenarioId) {
    case "loading":
      return [event(1, "status", { status: "queued", label: "正在准备分析", detail: "正在恢复工作区权限与语义版本" })];
    case "streaming":
      return success.slice(1, 8);
    case "clarification":
      return [
        event(1, "status", { status: "running", label: "正在识别业务口径" }),
        event(2, "clarification", {
          question: "你提到的“收入”对应多个已发布指标，本次希望使用哪个口径？",
          options: [
            { id: "gmv", label: "GMV", description: "下单金额，不扣除退款" },
            { id: "net_revenue", label: "净收入", description: "支付金额扣除退款" },
            { id: "recognized_revenue", label: "已确认收入", description: "财务确认口径" },
          ],
        }),
        event(3, "status", { status: "awaiting_clarification", label: "等待你确认口径" }),
      ];
    case "success":
      return success;
    case "empty":
      return [
        event(1, "status", { status: "running", label: "正在执行查询" }),
        cloneEvent(findEvent(success, "semantic_query"), 2),
        cloneEvent(findEvent(success, "sql"), 3),
        event(4, "data", { columns: queryColumns(query), rows: [], truncated: false }),
        event(5, "warning", { code: "NO_DATA_IN_RANGE", title: "当前范围没有数据", detail: "当前时间范围和筛选条件下没有符合权限的记录。" }),
        event(6, "status", { status: "empty", label: "查询完成，无结果" }),
      ];
    case "truncated":
      return [
        ...success.slice(0, 11),
        event(12, "warning", { code: "RESULT_TRUNCATED", title: "结果已截断", detail: `结果超过 ${query.limit} 行限制，当前仅展示可核查的部分结果。` }),
        event(13, "status", { status: "completed", label: "分析完成（部分结果）", detail: "结果超过限制，仍保留可核查数据" }),
      ].map((item) => item.event_type === "data" ? { ...item, payload: { ...item.payload, truncated: true } } : item);
    case "compile_failed":
      return [
        event(1, "status", { status: "running", label: "正在编译语义查询" }),
        cloneEvent(findEvent(success, "semantic_query"), 2),
        event(3, "error", { code: "QUERY_COMPILE_FAILED", title: "无法编译语义查询", detail: "当前维度组合无法映射到已发布语义包中的安全查询。", action: "调整维度组合后重新应用查询。", retryable: false }),
        event(4, "status", { status: "failed", label: "语义查询编译失败" }),
      ];
    case "denied":
      return [
        event(1, "status", { status: "running", label: "正在校验访问策略" }),
        event(2, "error", { code: "POLICY_DENIED", title: "没有权限访问毛利指标", detail: "当前 Viewer 角色不能访问成本和毛利字段。", action: "联系工作区管理员申请 finance_analyst 角色。" }),
        event(3, "status", { status: "rejected", label: "请求被策略拒绝" }),
      ];
    case "failed":
      return [
        event(1, "status", { status: "running", label: "正在执行查询" }),
        cloneEvent(findEvent(success, "semantic_query"), 2),
        cloneEvent(findEvent(success, "sql"), 3),
        event(4, "error", { code: "DATABASE_ERROR", title: "数据源暂时不可用", detail: "Demo Warehouse 在查询超时前没有返回结果。", action: "稍后重试，或缩短分析时间范围。", retryable: true }),
        event(5, "status", { status: "failed", label: "分析失败" }),
      ];
    case "cancelled":
      return [
        event(1, "status", { status: "running", label: "正在执行查询" }),
        event(2, "warning", { code: "RUN_CANCELLED", title: "分析已取消", detail: "查询已停止，没有发布不完整结果。" }),
        event(3, "status", { status: "cancelled", label: "已取消" }),
      ];
    case "recovered":
      return [
        event(1, "status", { status: "recovering", label: "正在恢复运行" }),
        event(2, "warning", { code: "STREAM_RECONNECTED", title: "连接已经恢复", detail: "已从事件 #3 继续，没有重复 Artifact。" }),
        ...resequence(success, 2),
      ];
  }
}

type EventType = AgentEvent["event_type"];
type EventPayload<T extends EventType> = Extract<AgentEvent, { event_type: T }>["payload"];

function event<T extends EventType>(sequence: number, eventType: T, payload: EventPayload<T>): Extract<AgentEvent, { event_type: T }> {
  return { run_id: runId, sequence, occurred_at: occurredAt, event_type: eventType, payload } as Extract<AgentEvent, { event_type: T }>;
}

function findEvent<T extends EventType>(events: AgentEvent[], eventType: T): Extract<AgentEvent, { event_type: T }> {
  const found = events.find((item): item is Extract<AgentEvent, { event_type: T }> => item.event_type === eventType);
  if (!found) throw new Error(`Fixture event not found: ${eventType}`);
  return found;
}

function cloneEvent<T extends AgentEvent>(item: T, sequence: number): T {
  return { ...structuredClone(item), sequence };
}

function resequence(events: AgentEvent[], afterSequence: number): AgentEvent[] {
  return events.map((item, index) => ({ ...item, sequence: afterSequence + index + 1 }));
}

function cloneQuery(query: FixtureQuery): FixtureQuery {
  return { ...query, dimensions: [...query.dimensions], filters: query.filters.map((filter) => ({ ...filter })) };
}

function mergeQuery(query: FixtureQuery, patch: QueryPatch): FixtureQuery {
  const dimensions = patch.dimensions?.filter(isDimensionId);
  return {
    ...query,
    ...(patch.metric && isMetricId(patch.metric) ? { metric: patch.metric } : {}),
    ...(dimensions?.length ? { dimensions } : {}),
    ...(patch.timeRange && isTimeRangeId(patch.timeRange) ? { timeRange: patch.timeRange } : {}),
    ...(patch.comparison && isComparisonId(patch.comparison) ? { comparison: patch.comparison } : {}),
    ...(typeof patch.limit === "number" && patch.limit > 0 ? { limit: Math.floor(patch.limit) } : {}),
    ...(patch.filters ? { filters: patch.filters.filter(isSupportedFilter) } : {}),
  };
}

function queryRows(query: FixtureQuery): ResultRow[] {
  const multiplier = metricMultipliers[query.metric];
  const timeRangeFactor = timeRangeFactors[query.timeRange];
  const comparisonFactor = comparisonFactors[query.comparison];
  const filtered = fixtureRows.filter((row) => query.filters.every((filter) => row[filter.field as keyof FixtureRow] === filter.value));
  const groups = new Map<string, { dimensions: Record<string, string>; current: number; previous: number }>();

  for (const row of filtered) {
    const dimensionValues = Object.fromEntries(query.dimensions.map((dimension) => [dimension, row[dimension]]));
    const key = query.dimensions.map((dimension) => row[dimension]).join("\u0000");
    const group = groups.get(key) ?? { dimensions: dimensionValues, current: 0, previous: 0 };
    group.current += row.current * multiplier * timeRangeFactor.current * comparisonFactor.current;
    group.previous += row.previous * multiplier * timeRangeFactor.previous * comparisonFactor.previous;
    groups.set(key, group);
  }

  return [...groups.values()]
    .map((group) => ({
      ...group.dimensions,
      current: roundCurrency(group.current),
      ...(query.comparison === "none" ? {} : {
        previous: roundCurrency(group.previous),
        change: group.previous === 0 ? null : round(((group.current - group.previous) / group.previous) * 100),
      }),
    }))
    .sort((left, right) => numberValue(right, "current") - numberValue(left, "current"))
    .slice(0, query.limit);
}

function compileSql(query: FixtureQuery): string {
  const dimensions = query.dimensions.join(", ");
  const filters = query.filters.length
    ? `\n  AND ${query.filters.map((filter) => `${filter.field} = :${filter.field}`).join("\n  AND ")}`
    : "";
  const timeRangeCondition = {
    previous_month: "occurred_at >= :previous_month_start AND occurred_at < :previous_month_end",
    year_to_date: "occurred_at >= :year_to_date_start AND occurred_at < :year_to_date_end",
    last_30_days: "occurred_at >= :last_30_days_start AND occurred_at < :last_30_days_end",
  }[query.timeRange];
  return `SELECT ${dimensions}, SUM(${query.metric}) AS current_value\nFROM analytics.channel_revenue\nWHERE ${timeRangeCondition}${filters}\nGROUP BY ${dimensions}\nORDER BY current_value DESC\nLIMIT :limit`;
}

function isMetricId(value: string): value is MetricId {
  return Object.prototype.hasOwnProperty.call(fixtureMetricLabels, value);
}

function isDimensionId(value: string): value is DimensionId {
  return Object.prototype.hasOwnProperty.call(fixtureDimensionLabels, value);
}

function isTimeRangeId(value: string): value is TimeRangeId {
  return Object.prototype.hasOwnProperty.call(fixtureTimeRangeLabels, value);
}

function isComparisonId(value: string): value is ComparisonId {
  return Object.prototype.hasOwnProperty.call(fixtureComparisonLabels, value);
}

function isSupportedFilter(filter: QueryFilter): boolean {
  return isDimensionId(filter.field) && filter.operator === "equals" && filter.value.trim().length > 0;
}

function queryColumns(query: FixtureQuery): string[] {
  return query.comparison === "none"
    ? [...query.dimensions, "current"]
    : [...query.dimensions, "current", "previous", "change"];
}

function numberValue(row: ResultRow, key: string): number {
  const value = row[key];
  return typeof value === "number" ? value : 0;
}

function formatChange(row: ResultRow): string {
  const change = numberValue(row, "change");
  return `${change >= 0 ? "+" : ""}${change}%`;
}

function round(value: number): number {
  return Number(value.toFixed(1));
}

function roundCurrency(value: number): number {
  return Number(value.toFixed(2));
}

export function createFixtureAnalysisRunSource(scenarioId: FixtureScenarioId): AnalysisRunSource {
  let query = cloneQuery(defaultQuery);
  let cancelled = false;
  return {
    async start() {
      query = cloneQuery(defaultQuery);
      cancelled = false;
      return { runId, semanticVersion: "ecommerce@3" };
    },
    async *observe(observedRunId) {
      if (observedRunId === runId) {
        const delay = scenarioId === "streaming" ? 120 : scenarioId === "success" ? 12 : 0;
        yield* streamEvents(scenarioEvents(scenarioId, query), delay, () => !cancelled);
      }
    },
    async *applyQueryPatch(observedRunId, patch, afterSequence) {
      if (observedRunId !== runId || cancelled) return;
      query = mergeQuery(query, patch);
      yield* cloneEvents(resequence(scenarioEvents(scenarioId, query), afterSequence));
    },
    async *submitClarification(observedRunId, optionId, afterSequence) {
      if (observedRunId !== runId || cancelled || !isMetricId(optionId)) return;
      query = mergeQuery(query, { metric: optionId });
      yield* cloneEvents(resequence(successEvents(query), afterSequence));
    },
    async *cancel(observedRunId, afterSequence) {
      if (observedRunId !== runId) return;
      cancelled = true;
      yield* cloneEvents(resequence([
        event(1, "warning", { code: "RUN_CANCELLED", title: "分析已取消", detail: "查询已停止，没有发布不完整结果。" }),
        event(2, "status", { status: "cancelled", label: "已取消" }),
      ], afterSequence));
    },
    async *retry(observedRunId, afterSequence) {
      if (observedRunId === runId) {
        cancelled = false;
        yield* cloneEvents(resequence(successEvents(query), afterSequence));
      }
    },
    async *submitFollowup(observedRunId, _question, afterSequence) {
      if (observedRunId === runId && !cancelled) yield* cloneEvents(resequence(successEvents(query), afterSequence));
    },
  };
}

function* cloneEvents(events: AgentEvent[]): Generator<AgentEvent> {
  for (const item of events) yield structuredClone(item);
}

async function* streamEvents(events: AgentEvent[], delay: number, shouldContinue: () => boolean): AsyncGenerator<AgentEvent> {
  for (const [index, item] of events.entries()) {
    if (delay && index > 0) await new Promise<void>((resolve) => setTimeout(resolve, delay));
    if (!shouldContinue()) return;
    yield structuredClone(item);
  }
}
