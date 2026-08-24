import type { AgentEvent, AnalysisRunStatus, ChartIntent, ResultRow, SemanticQuery, VerifiedFacts } from "@contracts/typescript/analysis-run";
import { readonly, shallowRef, type DeepReadonly, type Ref } from "vue";

import type { AnalysisRunSource, QueryPatch } from "./analysis-run-source";

type EventPayload<T extends AgentEvent["event_type"]> = Extract<AgentEvent, { event_type: T }>["payload"];

export interface AnalysisRunSnapshot {
  runId: string | null;
  question: string;
  status: AnalysisRunStatus;
  statusLabel: string;
  statusDetail?: string;
  statusHistory: string[];
  lastSequence: number;
  semanticVersion?: string;
  queryPatch: QueryPatch;
  semanticQuery?: SemanticQuery;
  sql?: EventPayload<"sql">;
  data?: { columns: string[]; rows: ResultRow[]; truncated: boolean };
  verifiedFacts?: VerifiedFacts;
  chart?: ChartIntent;
  clarification?: EventPayload<"clarification">;
  insightStream?: EventPayload<"insight"> & { complete: boolean };
  insights: EventPayload<"insight">[];
  warnings: EventPayload<"warning">[];
  errors: EventPayload<"error">[];
}

export interface AnalysisWorkspace {
  snapshot: DeepReadonly<Ref<AnalysisRunSnapshot>>;
  start(question: string): Promise<void>;
  applyQueryPatch(patch: QueryPatch): Promise<void>;
  submitClarification(optionId: string): Promise<void>;
  cancel(): Promise<void>;
  retry(): Promise<void>;
  submitFollowup(question: string): Promise<void>;
}

export function createAnalysisWorkspace(source: AnalysisRunSource): AnalysisWorkspace {
  const snapshot = shallowRef<AnalysisRunSnapshot>(initialSnapshot());
  let eventStreamVersion = 0;

  async function consume(events: AsyncIterable<AgentEvent>, version = eventStreamVersion) {
    for await (const event of events) {
      if (version !== eventStreamVersion) break;
      if (event.event_type === "insight") await consumeInsight(event, version);
      else snapshot.value = applyEvent(snapshot.value, event);
    }
  }

  async function consumeInsight(event: Extract<AgentEvent, { event_type: "insight" }>, version = eventStreamVersion) {
    if (event.run_id !== snapshot.value.runId || event.sequence <= snapshot.value.lastSequence) return;

    const tokens = Array.from(event.payload.claim);
    for (let end = 4; end < tokens.length; end += 4) {
      if (version !== eventStreamVersion) return;
      snapshot.value = applyInsightChunk(snapshot.value, event, tokens.slice(0, end).join(""), false);
      await wait(12);
    }
    if (version !== eventStreamVersion) return;
    snapshot.value = applyInsightChunk(snapshot.value, event, event.payload.claim, true);
  }

  function clearArtifacts(current: AnalysisRunSnapshot): AnalysisRunSnapshot {
    return {
      ...current,
      status: "queued",
      statusLabel: "准备更新分析",
      statusDetail: undefined,
      statusHistory: [],
      semanticQuery: undefined,
      sql: undefined,
      data: undefined,
      verifiedFacts: undefined,
      chart: undefined,
      clarification: undefined,
      insightStream: undefined,
      insights: [],
      warnings: [],
      errors: [],
    };
  }

  function activeRunId(): string {
    if (!snapshot.value.runId) throw new Error("AnalysisRun has not started");
    return snapshot.value.runId;
  }

  return {
    snapshot: readonly(snapshot),
    async start(question) {
      snapshot.value = { ...initialSnapshot(), question };
      const run = await source.start({ question });
      snapshot.value = { ...snapshot.value, runId: run.runId, semanticVersion: run.semanticVersion };
      const version = ++eventStreamVersion;
      await consume(source.observe(run.runId), version);
    },
    async applyQueryPatch(patch) {
      const runId = activeRunId();
      snapshot.value = clearArtifacts({ ...snapshot.value, queryPatch: mergeQueryPatch(snapshot.value.queryPatch, patch) });
      const version = ++eventStreamVersion;
      await consume(source.applyQueryPatch(runId, patch, snapshot.value.lastSequence), version);
    },
    async submitClarification(optionId) {
      snapshot.value = clearArtifacts(snapshot.value);
      const version = ++eventStreamVersion;
      await consume(source.submitClarification(activeRunId(), optionId, snapshot.value.lastSequence), version);
    },
    async cancel() {
      const runId = activeRunId();
      const afterSequence = snapshot.value.lastSequence;
      const version = ++eventStreamVersion;
      await consume(source.cancel(runId, afterSequence), version);
    },
    async retry() {
      snapshot.value = clearArtifacts(snapshot.value);
      const version = ++eventStreamVersion;
      await consume(source.retry(activeRunId(), snapshot.value.lastSequence), version);
    },
    async submitFollowup(question) {
      snapshot.value = clearArtifacts({ ...snapshot.value, question });
      const version = ++eventStreamVersion;
      await consume(source.submitFollowup(activeRunId(), question, snapshot.value.lastSequence), version);
    },
  };
}

function initialSnapshot(): AnalysisRunSnapshot {
  return { runId: null, question: "", status: "queued", statusLabel: "准备分析", lastSequence: 0, queryPatch: {}, statusHistory: [], insights: [], warnings: [], errors: [] };
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
        statusHistory: [...snapshot.statusHistory, event.payload.label],
      };
    case "clarification": return { ...next, clarification: event.payload, insightStream: undefined };
    case "semantic_query":
      return {
        ...next,
        queryPatch: { ...next.queryPatch, ...event.payload, dimensions: [...event.payload.dimensions] },
        semanticQuery: event.payload,
        clarification: undefined,
        insightStream: undefined,
      };
    case "sql": return { ...next, sql: event.payload };
    case "data": return { ...next, data: event.payload };
    case "verified_facts": return { ...next, verifiedFacts: event.payload };
    case "chart": return { ...next, chart: event.payload };
    case "insight": return applyInsightChunk(snapshot, event, event.payload.claim, true);
    case "warning": return { ...next, warnings: [...snapshot.warnings, event.payload] };
    case "error": return { ...next, errors: [...snapshot.errors, event.payload] };
  }
}

function applyInsightChunk(
  snapshot: AnalysisRunSnapshot,
  event: Extract<AgentEvent, { event_type: "insight" }>,
  claim: string,
  complete: boolean,
): AnalysisRunSnapshot {
  const next = {
    ...snapshot,
    lastSequence: event.sequence,
    insightStream: { ...event.payload, claim, complete },
  };
  const insights = snapshot.insights.some((insight) => insight.evidence === event.payload.evidence)
    ? snapshot.insights.map((insight) => insight.evidence === event.payload.evidence ? { ...event.payload, claim } : insight)
    : [{ ...event.payload, claim }];
  return { ...next, insights };
}

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function mergeQueryPatch(current: QueryPatch, patch: QueryPatch): QueryPatch {
  return {
    ...current,
    ...patch,
    ...(patch.dimensions ? { dimensions: [...patch.dimensions] } : {}),
    ...(patch.filters ? { filters: patch.filters.map((filter) => ({ ...filter })) } : {}),
  };
}
