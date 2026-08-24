import { describe, expect, it } from "vitest";

import { createFixtureAnalysisRunSource, fixtureScenarios } from "./fixture-analysis-run-source";

describe("FixtureAnalysisRunSource", () => {
  it("exposes every product state required by the Fixture Lab", () => {
    expect(fixtureScenarios.map((scenario) => scenario.id)).toEqual([
      "loading",
      "streaming",
      "clarification",
      "success",
      "empty",
      "truncated",
      "compile_failed",
      "denied",
      "failed",
      "cancelled",
      "recovered",
    ]);
  });

  it("produces independently typed artifacts for a successful analysis", async () => {
    const source = createFixtureAnalysisRunSource("success");
    const run = await source.start({ question: "看一下上个月收入最好的渠道，再和去年同期比较。" });
    const eventTypes: string[] = [];

    for await (const event of source.observe(run.runId)) {
      eventTypes.push(event.event_type);
    }

    expect(eventTypes).toEqual([
      "status",
      "status",
      "status",
      "semantic_query",
      "status",
      "sql",
      "status",
      "data",
      "verified_facts",
      "chart",
      "status",
      "insight",
      "status",
    ]);

    const statuses = [];
    for (const event of await collect(source.observe(run.runId))) {
      if (event.event_type === "status") statuses.push(event.payload.label);
    }
    expect(statuses).toEqual([
      "已收到问题",
      "正在理解分析意图",
      "正在检索语义上下文",
      "正在校验并编译查询",
      "正在执行查询",
      "正在生成洞察",
      "分析完成",
    ]);
  });

  it("stops a delayed stream after cancellation and does not replay later artifacts", async () => {
    const source = createFixtureAnalysisRunSource("streaming");
    const run = await source.start({ question: "可取消的分析" });
    const stream = source.observe(run.runId)[Symbol.asyncIterator]();
    const first = await stream.next();

    expect(first.value?.event_type).toBe("status");
    const cancellation = await collect(source.cancel(run.runId, first.value?.sequence ?? 0));
    const lastCancellation = cancellation[cancellation.length - 1];
    expect(lastCancellation?.event_type === "status" && lastCancellation.payload.status).toBe("cancelled");
    expect((await stream.next()).done).toBe(true);
  });

  it("applies a structured query patch without exposing raw SQL as input", async () => {
    const source = createFixtureAnalysisRunSource("success");
    const run = await source.start({ question: "调整查询" });
    const events = [];
    for await (const event of source.applyQueryPatch(run.runId, {
      metric: "gmv",
      timeRange: "year_to_date",
      comparison: "month_over_month",
      dimensions: ["region"],
      filters: [{ field: "region", operator: "equals", value: "华东" }],
    }, 8)) {
      events.push(event);
    }

    const semanticQuery = events.find((event) => event.event_type === "semantic_query");
    const sql = events.find((event) => event.event_type === "sql");
    const data = events.find((event) => event.event_type === "data");

    expect(semanticQuery?.event_type === "semantic_query" && semanticQuery.payload).toMatchObject({
      metric: "gmv",
      dimensions: ["region"],
      timeRange: "year_to_date",
      comparison: "month_over_month",
    });
    expect(sql?.event_type === "sql" && sql.payload.statement).toContain("region = :region");
    expect(sql?.event_type === "sql" && sql.payload.statement).toContain("year_to_date_start");
    expect(data?.event_type === "data" && data.payload.columns).toEqual(["region", "current", "previous", "change"]);
  });

  it("removes comparison fields when the query has no comparison", async () => {
    const source = createFixtureAnalysisRunSource("success");
    const run = await source.start({ question: "只看当前值" });
    const events = [];
    for await (const event of source.applyQueryPatch(run.runId, { comparison: "none" }, 8)) {
      events.push(event);
    }

    const data = events.find((event) => event.event_type === "data");
    expect(data?.event_type === "data" && data.payload.columns).toEqual(["channel", "current"]);
    expect(data?.event_type === "data" && data.payload.rows[0]).not.toHaveProperty("previous");
  });

  it.each([
    ["truncated", "RESULT_TRUNCATED"],
    ["compile_failed", "QUERY_COMPILE_FAILED"],
    ["failed", "DATABASE_ERROR"],
  ] as const)("exposes the %s failure/result boundary", async (scenarioId, expectedCode) => {
    const source = createFixtureAnalysisRunSource(scenarioId);
    const run = await source.start({ question: "检查结果" });
    const events = [];
    for await (const event of source.observe(run.runId)) {
      events.push(event);
    }

    expect(events.some((event) => event.event_type === "warning" && event.payload.code === expectedCode)
      || events.some((event) => event.event_type === "error" && event.payload.code === expectedCode)).toBe(true);
  });
});

async function collect(events: AsyncIterable<import("@contracts/typescript/analysis-run").AgentEvent>) {
  const collected = [];
  for await (const event of events) collected.push(event);
  return collected;
}
