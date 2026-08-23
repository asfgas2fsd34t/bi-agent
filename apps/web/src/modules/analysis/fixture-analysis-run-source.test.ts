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
      "semantic_query",
      "sql",
      "data",
      "verified_facts",
      "chart",
      "insight",
      "status",
    ]);
  });
});
