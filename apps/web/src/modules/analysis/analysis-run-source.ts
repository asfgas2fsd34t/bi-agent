import type { AgentEvent } from "@contracts/public/analysis-run";

export interface AnalysisRunSource {
  start(command: { question: string }): Promise<{ runId: string }>;
  observe(runId: string): AsyncIterable<AgentEvent>;
  submitClarification(runId: string, optionId: string, afterSequence: number): AsyncIterable<AgentEvent>;
  cancel(runId: string, afterSequence: number): AsyncIterable<AgentEvent>;
  retry(runId: string, afterSequence: number): AsyncIterable<AgentEvent>;
  submitFollowup(runId: string, question: string, afterSequence: number): AsyncIterable<AgentEvent>;
}
