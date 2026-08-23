import json
from pathlib import Path
from typing import Any

import pytest
from jsonschema import Draft202012Validator, ValidationError
from referencing import Registry, Resource
from pydantic import TypeAdapter

from bi_agent_agent.contracts import (
    AgentEvent,
    AnalysisRun,
    ChartIntent,
    QueryResult,
    SemanticQuery,
    StructuredError,
    VerifiedFacts,
)

ROOT = Path(__file__).resolve().parents[3]
SCHEMA_DIR = ROOT / "contracts" / "schemas" / "v1"
FIXTURE_DIR = ROOT / "contracts" / "fixtures" / "v1"


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def validate_fixture(fixture_name: str, schema_name: str) -> Any:
    schema = load_json(SCHEMA_DIR / schema_name)
    fixture = load_json(FIXTURE_DIR / fixture_name)
    registry = Registry()
    for path in SCHEMA_DIR.glob("*.schema.json"):
        document = load_json(path)
        registry = registry.with_resource(document["$id"], Resource.from_contents(document))
    Draft202012Validator(schema, registry=registry).validate(fixture)
    return fixture


def test_shared_fixtures_are_valid_for_python_contracts() -> None:
    semantic_query = validate_fixture("semantic-query.json", "semantic-query.schema.json")
    analysis_run = validate_fixture("analysis-run.json", "analysis-run.schema.json")
    query_result = validate_fixture("query-result.json", "query-result.schema.json")
    verified_facts = validate_fixture("verified-facts.json", "verified-facts.schema.json")
    chart_intent = validate_fixture("chart-intent.json", "chart-intent.schema.json")
    structured_error = validate_fixture("structured-error.json", "structured-error.schema.json")
    agent_event = validate_fixture("agent-event.json", "agent-event.schema.json")

    assert TypeAdapter(SemanticQuery).validate_python(semantic_query).metric == "net_revenue"
    assert AnalysisRun.model_validate(analysis_run).workspace_id == "demo-workspace"
    assert QueryResult.model_validate(query_result).rows[0]["channel"] == "抖音"
    facts = VerifiedFacts.model_validate(verified_facts)
    assert facts.facts[0].key == "net_revenue"
    assert facts.facts[1].attributes["share"] == 38.6
    assert ChartIntent.model_validate(chart_intent).kind == "bar"
    assert StructuredError.model_validate(structured_error).retryable is False
    assert TypeAdapter(AgentEvent).validate_python(agent_event).event_type == "status"


def test_agent_event_schema_binds_event_type_to_payload() -> None:
    schema = load_json(SCHEMA_DIR / "agent-event.schema.json")
    fixture = load_json(FIXTURE_DIR / "agent-event.json")
    fixture["event_type"] = "error"
    registry = Registry()
    for path in SCHEMA_DIR.glob("*.schema.json"):
        document = load_json(path)
        registry = registry.with_resource(document["$id"], Resource.from_contents(document))

    with pytest.raises(ValidationError):
        Draft202012Validator(schema, registry=registry).validate(fixture)
