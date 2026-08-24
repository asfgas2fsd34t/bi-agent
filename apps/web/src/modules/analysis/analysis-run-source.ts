import type { AgentEvent } from "@contracts/typescript/analysis-run";

export interface QueryFilter {
  field: string;
  operator: "equals";
  value: string;
}

export interface QueryPatch {
  metric?: string;
  dimensions?: string[];
  timeRange?: string;
  comparison?: string;
  limit?: number;
  filters?: QueryFilter[];
}

export interface AnalysisRunSource {
  start(command: { question: string }): Promise<{ runId: string; semanticVersion?: string }>;
  observe(runId: string): AsyncIterable<AgentEvent>;
  applyQueryPatch(runId: string, patch: QueryPatch, afterSequence: number): AsyncIterable<AgentEvent>;
  submitClarification(runId: string, optionId: string, afterSequence: number): AsyncIterable<AgentEvent>;
  cancel(runId: string, afterSequence: number): AsyncIterable<AgentEvent>;
  retry(runId: string, afterSequence: number): AsyncIterable<AgentEvent>;
  submitFollowup(runId: string, question: string, afterSequence: number): AsyncIterable<AgentEvent>;
}
