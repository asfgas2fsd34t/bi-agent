import type { AgentEvent, AnalysisRunStatus, ChartIntent, ResultRow, SemanticQuery, VerifiedFacts } from "@contracts/typescript/analysis-run";
import { readonly, shallowRef, type DeepReadonly, type Ref } from "vue";

import type { AnalysisRunSource } from "./analysis-run-source";

type EventPayload<T extends AgentEvent["event_type"]> = Extract<AgentEvent, { event_type: T }>["payload"];

export interface AnalysisRunSnapshot {
  runId: string | null;
  question: string;
  status: AnalysisRunStatus;
  statusLabel: string;
  statusDetail?: string;
  lastSequence: number;
  semanticQuery?: SemanticQuery;
  sql?: EventPayload<"sql">;
  data?: { columns: string[]; rows: ResultRow[]; truncated: boolean };
  verifiedFacts?: VerifiedFacts;
  chart?: ChartIntent;
  clarification?: EventPayload<"clarification">;
  insights: EventPayload<"insight">[];
  warnings: EventPayload<"warning">[];
  errors: EventPayload<"error">[];
}

export interface AnalysisWorkspace {
  snapshot: DeepReadonly<Ref<AnalysisRunSnapshot>>;
  start(question: string): Promise<void>;
  submitClarification(optionId: string): Promise<void>;
  cancel(): Promise<void>;
  retry(): Promise<void>;
  submitFollowup(question: string): Promise<void>;
}

export function createAnalysisWorkspace(source: AnalysisRunSource): AnalysisWorkspace {
  const snapshot = shallowRef<AnalysisRunSnapshot>(initialSnapshot());

  async function consume(events: AsyncIterable<AgentEvent>) {
    for await (const event of events) snapshot.value = applyEvent(snapshot.value, event);
  }

  function activeRunId(): string {
    if (!snapshot.value.runId) throw new Error("AnalysisRun has not started");
    return snapshot.value.runId;
  }

  return {
    snapshot: readonly(snapshot),
    async start(question) {
      const run = await source.start({ question });
      snapshot.value = { ...initialSnapshot(), runId: run.runId, question };
      await consume(source.observe(run.runId));
    },
    async submitClarification(optionId) {
      await consume(source.submitClarification(activeRunId(), optionId, snapshot.value.lastSequence));
    },
    async cancel() {
      await consume(source.cancel(activeRunId(), snapshot.value.lastSequence));
    },
    async retry() {
      await consume(source.retry(activeRunId(), snapshot.value.lastSequence));
    },
    async submitFollowup(question) {
      snapshot.value = { ...snapshot.value, question };
      await consume(source.submitFollowup(activeRunId(), question, snapshot.value.lastSequence));
    },
  };
}

function initialSnapshot(): AnalysisRunSnapshot {
  return { runId: null, question: "", status: "queued", statusLabel: "准备分析", lastSequence: 0, insights: [], warnings: [], errors: [] };
}

function applyEvent(snapshot: AnalysisRunSnapshot, event: AgentEvent): AnalysisRunSnapshot {
  if (event.run_id !== snapshot.runId || event.sequence <= snapshot.lastSequence) return snapshot;
  const next = { ...snapshot, lastSequence: event.sequence };
  switch (event.event_type) {
    case "status":
      return {
        ...next,
        status: event.payload.status,
        statusLabel: event.payload.label,
        statusDetail: event.payload.detail,
        errors: event.payload.status === "running" ? [] : snapshot.errors,
      };
    case "clarification": return { ...next, clarification: event.payload };
    case "semantic_query": return { ...next, semanticQuery: event.payload, clarification: undefined };
    case "sql": return { ...next, sql: event.payload };
    case "data": return { ...next, data: event.payload };
    case "verified_facts": return { ...next, verifiedFacts: event.payload };
    case "chart": return { ...next, chart: event.payload };
    case "insight": return { ...next, insights: [...snapshot.insights, event.payload] };
    case "warning": return { ...next, warnings: [...snapshot.warnings, event.payload] };
    case "error": return { ...next, errors: [...snapshot.errors, event.payload] };
  }
}
