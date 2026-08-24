import { afterEach, describe, expect, it, vi } from "vitest";

import { createHttpAnalysisRunSource } from "./http-analysis-run-source";

afterEach(() => vi.restoreAllMocks());

describe("HTTP AnalysisRun source", () => {
  it("submits a Query Patch and returns the Java-produced events", async () => {
    const event = {
      run_id: "run-1",
      sequence: 2,
      occurred_at: "2026-08-24T08:00:00Z",
      event_type: "status",
      payload: { status: "running", label: "正在执行查询" },
    } as const;
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => [event],
    } as Response);

    const source = createHttpAnalysisRunSource();
    const events = [];
    for await (const item of source.applyQueryPatch("run-1", {
      metric: "gmv",
      dimensions: ["channel", "region"],
      timeRange: "year_to_date",
      comparison: "month_over_month",
      filters: [{ field: "region", operator: "equals", value: "华东" }],
    }, 1)) {
      events.push(item);
    }

    expect(events).toEqual([event]);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/runs/run-1/query?after_sequence=1",
      expect.objectContaining({ method: "POST", body: JSON.stringify({
        metric: "gmv",
        dimensions: ["channel", "region"],
        timeRange: "year_to_date",
        comparison: "month_over_month",
        filters: [{ field: "region", operator: "equals", value: "华东" }],
      }) })
    );
  });
});
