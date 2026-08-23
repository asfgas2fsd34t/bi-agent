/** TypeScript view of the v1 contract shared by the Web, Java BI Core and Python Agent. */

export const CONTRACT_VERSION = "v1" as const;

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

export interface AnalysisRun {
  run_id: string;
  workspace_id: string;
  status: AnalysisRunStatus;
  question: string;
  semantic_version: string;
  created_at: string;
  updated_at: string;
}

export type ResultValue = string | number | null;
export type ResultRow = Record<string, ResultValue>;

export interface VerifiedFact {
  key: string;
  label: string;
  value: ResultValue;
  formattedValue?: string;
  unit?: string;
  change?: number;
  attributes?: Record<string, ResultValue>;
}

export interface VerifiedFacts {
  facts: VerifiedFact[];
  asOf: string;
}

export interface ChartSeries {
  name: string;
  field: string;
}

export interface StructuredError {
  code: string;
  title: string;
  detail: string;
  action: string;
  retryable?: boolean;
}

export interface QueryResult {
  columns: string[];
  rows: ResultRow[];
  truncated: boolean;
}

export interface ChartIntent {
  kind: "bar" | "line" | "area" | "pie" | "table";
  categoryField: string;
  series: ChartSeries[];
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
      payload: { dialect: "postgresql" | "duckdb"; statement: string };
    })
  | (AgentEventBase & { event_type: "data"; payload: QueryResult })
  | (AgentEventBase & { event_type: "verified_facts"; payload: VerifiedFacts })
  | (AgentEventBase & { event_type: "chart"; payload: ChartIntent })
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
      payload: StructuredError;
    });
