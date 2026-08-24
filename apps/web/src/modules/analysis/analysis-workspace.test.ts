import { describe, expect, it } from "vitest";

import { createAnalysisWorkspace } from "./analysis-workspace";
import { createFixtureAnalysisRunSource, type FixtureScenarioId } from "./fixture-analysis-run-source";
import type { AgentEvent, AnalysisRunStatus } from "@contracts/typescript/analysis-run";

describe("Analysis Workspace", () => {
  it.each<[FixtureScenarioId, AnalysisRunStatus]>([
    ["loading", "queued"],
    ["streaming", "running"],
    ["clarification", "awaiting_clarification"],
    ["success", "completed"],
    ["empty", "empty"],
    ["truncated", "completed"],
    ["compile_failed", "failed"],
    ["denied", "rejected"],
    ["failed", "failed"],
    ["cancelled", "cancelled"],
    ["recovered", "completed"],
  ])("exposes the %s fixture as a %s AnalysisRun", async (scenarioId, expectedStatus) => {
    const workspace = createAnalysisWorkspace(createFixtureAnalysisRunSource(scenarioId));

    await workspace.start("看一下上个月收入最好的渠道，再和去年同期比较。");

    expect(workspace.snapshot.value.status).toBe(expectedStatus);
  });

  it("keeps typed artifacts separate instead of deriving them from Markdown", async () => {
    const workspace = createAnalysisWorkspace(createFixtureAnalysisRunSource("success"));

    await workspace.start("渠道净收入同比");

    expect(workspace.snapshot.value.semanticQuery?.metric).toBe("net_revenue");
    expect(workspace.snapshot.value.sql?.dialect).toBe("postgresql");
    expect(workspace.snapshot.value.data?.rows).toHaveLength(5);
    expect(workspace.snapshot.value.chart?.kind).toBe("bar");
    expect(workspace.snapshot.value.insights[0]?.evidence).toBe("data.rows[channel=抖音]");
    expect(workspace.snapshot.value.insightStream?.complete).toBe(true);
    expect(workspace.snapshot.value.verifiedFacts?.facts.find((fact) => fact.key === "net_revenue")?.change).toBe(13.6);
  });

  it("exposes the user question before the source finishes starting", async () => {
    const workspace = createAnalysisWorkspace(createFixtureAnalysisRunSource("success"));
    const start = workspace.start("立即显示这条问题");

    expect(workspace.snapshot.value.question).toBe("立即显示这条问题");
    await start;
  });

  it("applies a clarification choice through the Analysis Workspace Interface", async () => {
    const workspace = createAnalysisWorkspace(createFixtureAnalysisRunSource("clarification"));
    await workspace.start("收入同比");

    await workspace.submitClarification("gmv");

    expect(workspace.snapshot.value.status).toBe("completed");
    expect(workspace.snapshot.value.semanticQuery?.metric).toBe("gmv");
    expect(workspace.snapshot.value.verifiedFacts?.facts.find((fact) => fact.key === "gmv")?.label).toBe("GMV");
  });

  it("rebuilds artifacts from a structured query patch", async () => {
    const workspace = createAnalysisWorkspace(createFixtureAnalysisRunSource("success"));
    await workspace.start("渠道净收入同比");

    await workspace.applyQueryPatch({
      metric: "gmv",
      dimensions: ["region"],
      timeRange: "year_to_date",
      comparison: "month_over_month",
      filters: [{ field: "region", operator: "equals", value: "华东" }],
    });

    expect(workspace.snapshot.value.queryPatch.filters).toEqual([{ field: "region", operator: "equals", value: "华东" }]);
    expect(workspace.snapshot.value.semanticQuery).toMatchObject({ metric: "gmv", dimensions: ["region"], timeRange: "year_to_date", comparison: "month_over_month" });
    expect(workspace.snapshot.value.data?.columns).toEqual(["region", "current", "previous", "change"]);
    expect(workspace.snapshot.value.data?.rows).toHaveLength(1);
  });

  it("cancels and retries through the Analysis Workspace Interface", async () => {
    const running = createAnalysisWorkspace(createFixtureAnalysisRunSource("streaming"));
    await running.start("渠道净收入同比");
    await running.cancel();
    expect(running.snapshot.value.status).toBe("cancelled");

    const failed = createAnalysisWorkspace(createFixtureAnalysisRunSource("failed"));
    await failed.start("渠道净收入同比");
    await failed.retry();
    expect(failed.snapshot.value.status).toBe("completed");
    expect(failed.snapshot.value.errors).toHaveLength(0);
  });

  it("ignores duplicate and older events after a sequence was observed", async () => {
    const newer = statusEvent(2, "completed", "分析完成");
    const duplicate = statusEvent(2, "failed", "重复失败事件");
    const older = statusEvent(1, "failed", "过期失败事件");
    const source = {
      async start() {
        return { runId: "run-sequence" };
      },
      async *observe() {
        yield newer;
        yield duplicate;
        yield older;
      },
      async *applyQueryPatch() {},
      async *submitClarification() {},
      async *cancel() {},
      async *retry() {},
      async *submitFollowup() {},
    };
    const workspace = createAnalysisWorkspace(source);

    await workspace.start("验证事件顺序");

    expect(workspace.snapshot.value.status).toBe("completed");
    expect(workspace.snapshot.value.lastSequence).toBe(2);
  });
});

function statusEvent(sequence: number, status: AnalysisRunStatus, label: string): AgentEvent {
  return {
    run_id: "run-sequence",
    sequence,
    occurred_at: "2026-08-23T07:30:00.000Z",
    event_type: "status",
    payload: { status, label },
  };
}
