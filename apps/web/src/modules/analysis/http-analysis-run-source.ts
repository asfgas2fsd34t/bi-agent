import type { AgentEvent } from "@contracts/typescript/analysis-run";

import type { AnalysisRunSource } from "./analysis-run-source";

interface StartResponse {
  run_id: string;
  semantic_version?: string;
}

async function readJson<T>(response: Response): Promise<T> {
  if (!response.ok) throw new Error(`Analysis service returned HTTP ${response.status}`);
  return (await response.json()) as T;
}

export function createHttpAnalysisRunSource(): AnalysisRunSource {
  return {
    async start({ question }) {
      const response = await fetch("/api/v1/demo/runs", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question }),
      });
      const run = await readJson<StartResponse>(response);
      return { runId: run.run_id, semanticVersion: run.semantic_version };
    },
    async *observe(runId) {
      const response = await fetch(`/api/v1/runs/${encodeURIComponent(runId)}/events`);
      const events = await readJson<AgentEvent[]>(response);
      yield* events;
    },
    async *applyQueryPatch() {
      // The contract baseline only exposes the one-way demo event path.
    },
    async *submitClarification() {
      // The contract baseline only exposes the one-way demo event path.
    },
    async *cancel() {
      // The contract baseline only exposes the one-way demo event path.
    },
    async *retry() {
      // The contract baseline only exposes the one-way demo event path.
    },
    async *submitFollowup() {
      // The contract baseline only exposes the one-way demo event path.
    },
  };
}
