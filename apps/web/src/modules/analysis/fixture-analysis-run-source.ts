import type { AgentEvent, ResultRow } from "@contracts/typescript/analysis-run";

import type { AnalysisRunSource } from "./analysis-run-source";

export type FixtureScenarioId =
  | "loading"
  | "streaming"
  | "clarification"
  | "success"
  | "empty"
  | "denied"
  | "failed"
  | "cancelled"
  | "recovered";

type MetricId = "net_revenue" | "gmv" | "recognized_revenue";

export interface FixtureScenario {
  id: FixtureScenarioId;
  label: string;
  description: string;
}

export const fixtureScenarios: FixtureScenario[] = [
  { id: "loading", label: "加载", description: "运行已创建，正在准备语义上下文" },
  { id: "streaming", label: "流式", description: "typed events 正在持续抵达" },
  { id: "clarification", label: "澄清", description: "业务术语存在多个已发布口径" },
  { id: "success", label: "成功", description: "完整图表、数据与证据化洞察" },
  { id: "empty", label: "空结果", description: "查询成功，但时间范围内没有数据" },
  { id: "denied", label: "拒绝", description: "权限策略拒绝访问敏感指标" },
  { id: "failed", label: "失败", description: "执行失败并返回可行动错误" },
  { id: "cancelled", label: "取消", description: "用户终止了运行" },
  { id: "recovered", label: "恢复", description: "断线后从事件序号恢复" },
];

const runId = "run-fixture-184";
const occurredAt = "2026-08-23T07:30:00.000Z";
const resultRows: ResultRow[] = [
  { channel: "抖音", current: 4.82, previous: 4.06, change: 18.7 },
  { channel: "淘宝", current: 3.46, previous: 3.08, change: 12.3 },
  { channel: "京东", current: 2.66, previous: 2.49, change: 6.8 },
  { channel: "小红书", current: 1.1, previous: 0.86, change: 27.9 },
  { channel: "官网", current: 0.44, previous: 0.5, change: -12 },
];
const metricLabels: Record<MetricId, string> = {
  net_revenue: "净收入",
  gmv: "GMV",
  recognized_revenue: "已确认收入",
};

function successEvents(metric: MetricId = "net_revenue"): AgentEvent[] {
  const label = metricLabels[metric];
  return [
    event(1, "status", { status: "running", label: "正在分析", detail: "已载入 ecommerce@3" }),
    event(2, "semantic_query", { metric, dimensions: ["channel"], timeRange: "previous_month", comparison: "year_over_year", limit: 10 }),
    event(3, "sql", {
      dialect: "postgresql",
      statement: `SELECT channel, SUM(${metric}) AS current_value\nFROM analytics.channel_revenue\nWHERE occurred_at >= :start_at AND occurred_at < :end_at\nGROUP BY channel\nORDER BY current_value DESC\nLIMIT :limit`,
    }),
    event(4, "data", { columns: ["channel", "current", "previous", "change"], rows: resultRows, truncated: false }),
    event(5, "verified_facts", {
      facts: [
        { key: metric, label, value: 12480000, formattedValue: "¥12.48M", unit: "CNY", change: 13.6, attributes: {} },
        { key: "top_channel", label: "领先渠道", value: "抖音", formattedValue: "¥4.82M", unit: "CNY", attributes: { share: 38.6 } },
        { key: "data_freshness", label: "数据新鲜度", value: "2026-08-01T08:30:00+08:00", formattedValue: "08:30", attributes: { date: "2026-08-01" } },
      ],
      asOf: "2026-08-01T08:30:00+08:00",
    }),
    event(6, "chart", {
      kind: "bar",
      categoryField: "channel",
      series: [
        { name: "2026 年 7 月", field: "current" },
        { name: "2025 年 7 月", field: "previous" },
      ],
    }),
    event(7, "insight", { claim: `抖音${label} ¥4.82M，排名第一，同比增长 18.7%。`, evidence: "data.rows[channel=抖音]" }),
    event(8, "status", { status: "completed", label: "分析完成", detail: "8 个事件已验证" }),
  ];
}

function scenarioEvents(scenarioId: FixtureScenarioId): AgentEvent[] {
  const success = successEvents();
  const scenarios: Record<FixtureScenarioId, AgentEvent[]> = {
    loading: [event(1, "status", { status: "queued", label: "正在准备分析", detail: "正在恢复工作区权限与语义版本" })],
    streaming: success.slice(0, 4),
    clarification: [
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
    ],
    success,
    empty: [
      event(1, "status", { status: "running", label: "正在执行查询" }),
      success[1]!,
      event(3, "data", { columns: ["channel", "current", "previous", "change"], rows: [], truncated: false }),
      event(4, "warning", { code: "NO_DATA_IN_RANGE", title: "当前范围没有数据", detail: "2026 年 7 月没有符合权限和筛选条件的记录。" }),
      event(5, "status", { status: "empty", label: "查询完成，无结果" }),
    ],
    denied: [
      event(1, "status", { status: "running", label: "正在校验访问策略" }),
      event(2, "error", { code: "POLICY_DENIED", title: "没有权限访问毛利指标", detail: "当前 Viewer 角色不能访问成本和毛利字段。", action: "联系工作区管理员申请 finance_analyst 角色。" }),
      event(3, "status", { status: "rejected", label: "请求被策略拒绝" }),
    ],
    failed: [
      event(1, "status", { status: "running", label: "正在执行查询" }),
      success[1]!,
      success[2]!,
      event(4, "error", { code: "DATABASE_ERROR", title: "数据源暂时不可用", detail: "Demo Warehouse 在查询超时前没有返回结果。", action: "稍后重试，或缩短分析时间范围。" }),
      event(5, "status", { status: "failed", label: "分析失败" }),
    ],
    cancelled: [
      event(1, "status", { status: "running", label: "正在执行查询" }),
      event(2, "warning", { code: "RUN_CANCELLED", title: "分析已取消", detail: "查询已停止，没有发布不完整结果。" }),
      event(3, "status", { status: "cancelled", label: "已取消" }),
    ],
    recovered: [
      event(1, "status", { status: "recovering", label: "正在恢复运行" }),
      event(2, "warning", { code: "STREAM_RECONNECTED", title: "连接已经恢复", detail: "已从事件 #3 继续，没有重复 Artifact。" }),
      ...resequence(success, 2),
    ],
  };
  return scenarios[scenarioId];
}

type EventType = AgentEvent["event_type"];
type EventPayload<T extends EventType> = Extract<AgentEvent, { event_type: T }>["payload"];

function event<T extends EventType>(sequence: number, eventType: T, payload: EventPayload<T>): Extract<AgentEvent, { event_type: T }> {
  return { run_id: runId, sequence, occurred_at: occurredAt, event_type: eventType, payload } as Extract<AgentEvent, { event_type: T }>;
}

function resequence(events: AgentEvent[], afterSequence: number): AgentEvent[] {
  return events.map((item, index) => ({ ...item, sequence: afterSequence + index + 1 }));
}

function isMetricId(value: string): value is MetricId {
  return value in metricLabels;
}

export function createFixtureAnalysisRunSource(scenarioId: FixtureScenarioId): AnalysisRunSource {
  let metric: MetricId = "net_revenue";
  return {
    async start() {
      return { runId };
    },
    async *observe(observedRunId) {
      if (observedRunId === runId) yield* cloneEvents(scenarioEvents(scenarioId));
    },
    async *submitClarification(observedRunId, optionId, afterSequence) {
      if (observedRunId !== runId || !isMetricId(optionId)) return;
      metric = optionId;
      yield* cloneEvents(resequence(successEvents(metric), afterSequence));
    },
    async *cancel(observedRunId, afterSequence) {
      if (observedRunId !== runId) return;
      yield* cloneEvents(resequence([
        event(1, "warning", { code: "RUN_CANCELLED", title: "分析已取消", detail: "查询已停止，没有发布不完整结果。" }),
        event(2, "status", { status: "cancelled", label: "已取消" }),
      ], afterSequence));
    },
    async *retry(observedRunId, afterSequence) {
      if (observedRunId === runId) yield* cloneEvents(resequence(successEvents(metric), afterSequence));
    },
    async *submitFollowup(observedRunId, _question, afterSequence) {
      if (observedRunId === runId) yield* cloneEvents(resequence(successEvents(metric), afterSequence));
    },
  };
}

function* cloneEvents(events: AgentEvent[]): Generator<AgentEvent> {
  for (const item of events) yield structuredClone(item);
}
