import Ajv from "ajv/dist/2020";
import addFormats from "ajv-formats";
import type { ValidateFunction } from "ajv";
import { describe, expect, it } from "vitest";

import type { AgentEvent, AnalysisRun, ChartIntent, QueryResult, SemanticQuery, StructuredError, VerifiedFacts } from "@contracts/typescript/analysis-run";
import agentEventFixture from "@contracts/fixtures/v1/agent-event.json";
import analysisRunFixture from "@contracts/fixtures/v1/analysis-run.json";
import chartIntentFixture from "@contracts/fixtures/v1/chart-intent.json";
import queryResultFixture from "@contracts/fixtures/v1/query-result.json";
import semanticQueryFixture from "@contracts/fixtures/v1/semantic-query.json";
import structuredErrorFixture from "@contracts/fixtures/v1/structured-error.json";
import verifiedFactsFixture from "@contracts/fixtures/v1/verified-facts.json";
import agentEventSchema from "@contracts/schemas/v1/agent-event.schema.json";
import analysisRunSchema from "@contracts/schemas/v1/analysis-run.schema.json";
import chartIntentSchema from "@contracts/schemas/v1/chart-intent.schema.json";
import queryResultSchema from "@contracts/schemas/v1/query-result.schema.json";
import semanticQuerySchema from "@contracts/schemas/v1/semantic-query.schema.json";
import structuredErrorSchema from "@contracts/schemas/v1/structured-error.schema.json";
import verifiedFactsSchema from "@contracts/schemas/v1/verified-facts.schema.json";

const validator = new Ajv({ allErrors: true, allowUnionTypes: true });
addFormats(validator);
[semanticQuerySchema, analysisRunSchema, queryResultSchema, verifiedFactsSchema, chartIntentSchema, structuredErrorSchema, agentEventSchema].forEach((schema) => {
  validator.addSchema(schema, schema.$id);
});

describe("versioned v1 contracts", () => {
  it("accepts the shared fixtures in the TypeScript consumer", () => {
    const cases: Array<[unknown, { $id: string }]> = [
      [semanticQueryFixture, semanticQuerySchema],
      [analysisRunFixture, analysisRunSchema],
      [queryResultFixture, queryResultSchema],
      [verifiedFactsFixture, verifiedFactsSchema],
      [chartIntentFixture, chartIntentSchema],
      [structuredErrorFixture, structuredErrorSchema],
      [agentEventFixture, agentEventSchema],
    ];

    for (const [fixture, schema] of cases) {
      expect(validator.validate(schema.$id, fixture), validator.errorsText()).toBe(true);
    }

    const typedSemanticQuery = validateFixture<SemanticQuery>(semanticQuerySchema.$id, semanticQueryFixture);
    const typedAnalysisRun = validateFixture<AnalysisRun>(analysisRunSchema.$id, analysisRunFixture);
    const typedEvent = validateFixture<AgentEvent>(agentEventSchema.$id, agentEventFixture);
    const typedError = validateFixture<StructuredError>(structuredErrorSchema.$id, structuredErrorFixture);
    const typedResult = validateFixture<QueryResult>(queryResultSchema.$id, queryResultFixture);
    const typedFacts = validateFixture<VerifiedFacts>(verifiedFactsSchema.$id, verifiedFactsFixture);
    const typedChart = validateFixture<ChartIntent>(chartIntentSchema.$id, chartIntentFixture);
    expect([typedSemanticQuery, typedAnalysisRun, typedEvent, typedError, typedResult, typedFacts, typedChart]).toHaveLength(7);
  });

  it("rejects an event whose payload does not match its event type", () => {
    const invalidEvent = { ...agentEventFixture, event_type: "error" };
    expect(validator.validate(agentEventSchema.$id, invalidEvent)).toBe(false);
  });
});

function validateFixture<T>(schemaId: string, value: unknown): T {
  const validate = validator.getSchema<T>(schemaId);
  if (!validate || !isValid(validate, value)) throw new Error(validator.errorsText(validate?.errors));
  return value;
}

function isValid<T>(validate: ValidateFunction<T>, value: unknown): value is T {
  return validate(value);
}
