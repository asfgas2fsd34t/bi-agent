/**
 * Provisional public contract used by the frontend-first Fixture Lab.
 * Issue #3 will freeze this model as versioned JSON Schema/OpenAPI.
 */

export type AnalysisRunStatus =
  | "queued"
  | "running"
  | "awaiting_clarification"
  | "completed"
  | "empty"
  | "rejected"
  | "failed"
  | "cancelled"
  | "recovering";

export interface SemanticQuery {
  metric: string;
  dimensions: string[];
  timeRange: string;
  comparison: string;
  limit: number;
}

export type ResultValue = string | number | null;
export type ResultRow = Record<string, ResultValue>;

export interface ChartSeries {
  name: string;
  field: string;
}

export interface VerifiedFacts {
  total: { label: string; formattedValue: string; change: number };
  leader: { label: string; formattedValue: string; share: number };
  freshness: { time: string; date: string };
}

interface AgentEventBase {
  run_id: string;
  sequence: number;
  occurred_at: string;
}

export type AgentEvent =
  | (AgentEventBase & {
      event_type: "status";
      payload: { status: AnalysisRunStatus; label: string; detail?: string };
    })
  | (AgentEventBase & {
      event_type: "clarification";
      payload: {
        question: string;
        options: Array<{ id: string; label: string; description: string }>;
      };
    })
  | (AgentEventBase & { event_type: "semantic_query"; payload: SemanticQuery })
  | (AgentEventBase & {
      event_type: "sql";
      payload: { dialect: "postgresql"; statement: string };
    })
  | (AgentEventBase & {
      event_type: "data";
      payload: { columns: string[]; rows: ResultRow[]; truncated: boolean };
    })
  | (AgentEventBase & { event_type: "verified_facts"; payload: VerifiedFacts })
  | (AgentEventBase & {
      event_type: "chart";
      payload: { kind: "comparison_bar"; categoryField: string; series: ChartSeries[] };
    })
  | (AgentEventBase & {
      event_type: "insight";
      payload: { claim: string; evidence: string; limitation?: string };
    })
  | (AgentEventBase & {
      event_type: "warning";
      payload: { code: string; title: string; detail: string };
    })
  | (AgentEventBase & {
      event_type: "error";
      payload: { code: string; title: string; detail: string; action: string };
    });
