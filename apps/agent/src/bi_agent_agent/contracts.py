"""Python Agent 使用的 v1 跨语言契约模型。"""

from __future__ import annotations

from datetime import datetime
from typing import Annotated, Literal, TypeAlias

from pydantic import BaseModel, ConfigDict, Field


class ContractModel(BaseModel):
    """所有公共契约模型的基类，拒绝未声明的额外字段。"""

    model_config = ConfigDict(extra="forbid")


# 分析运行在生命周期中的可用状态。
AnalysisRunStatus: TypeAlias = Literal[
    "queued",
    "running",
    "awaiting_clarification",
    "completed",
    "empty",
    "rejected",
    "failed",
    "cancelled",
    "recovering",
]


class SemanticQuery(ContractModel):
    """Agent 从用户问题中提取出的结构化查询意图。"""

    metric: str
    dimensions: list[str]
    timeRange: str
    comparison: str
    limit: int = Field(ge=1, le=1000)


class AnalysisRun(ContractModel):
    """一次分析运行的状态、问题和时间信息。"""

    run_id: str
    workspace_id: str
    status: AnalysisRunStatus
    question: str
    semantic_version: str
    created_at: datetime
    updated_at: datetime


class StructuredError(ContractModel):
    """面向用户或上层服务的结构化错误信息。"""

    code: str
    title: str
    detail: str
    action: str
    retryable: bool | None = None


# 查询结果单元格允许的 JSON 标量类型。
ResultValue: TypeAlias = str | int | float | None


class QueryResult(ContractModel):
    """数据查询返回的表格结果。"""

    columns: list[str]
    rows: list[dict[str, ResultValue]]
    truncated: bool


class VerifiedFact(ContractModel):
    """一个带稳定标识和可选展示信息的事实。"""

    key: str
    label: str
    value: ResultValue
    formattedValue: str | None = None
    unit: str | None = None
    change: float | None = None
    attributes: dict[str, ResultValue] = Field(default_factory=dict)


class VerifiedFacts(ContractModel):
    """从查询结果确定性推导出的、可以回算的事实集合。"""

    facts: list[VerifiedFact] = Field(min_length=1)
    asOf: datetime


class ChartSeries(ContractModel):
    """图表序列的展示名称和数据字段映射。"""

    name: str
    field: str


class ChartIntent(ContractModel):
    """描述前端应如何根据结果生成图表。"""

    kind: Literal["bar", "line", "area", "pie", "table"]
    categoryField: str
    series: list[ChartSeries] = Field(min_length=1)


class StatusPayload(ContractModel):
    """状态事件携带的运行状态和展示文案。"""

    status: AnalysisRunStatus
    label: str
    detail: str | None = None


class ClarificationOption(ContractModel):
    """澄清问题中的一个可选项。"""

    id: str
    label: str
    description: str


class ClarificationPayload(ContractModel):
    """需要用户回答的澄清问题及选项。"""

    question: str
    options: list[ClarificationOption] = Field(min_length=1)


class SqlPayload(ContractModel):
    """SQL 事件携带的方言和 SQL 文本。"""

    dialect: Literal["postgresql", "duckdb"]
    statement: str


class InsightPayload(ContractModel):
    """洞察事件携带的结论、证据和限制说明。"""

    claim: str
    evidence: str
    limitation: str | None = None


class WarningPayload(ContractModel):
    """非阻断性告警事件的内容。"""

    code: str
    title: str
    detail: str


class StatusEvent(ContractModel):
    """表示 Agent 当前执行状态的事件。"""

    run_id: str
    sequence: int = Field(ge=1)
    occurred_at: datetime
    event_type: Literal["status"]
    payload: StatusPayload


class ClarificationEvent(ContractModel):
    """表示 Agent 需要用户补充信息的事件。"""

    run_id: str
    sequence: int = Field(ge=1)
    occurred_at: datetime
    event_type: Literal["clarification"]
    payload: ClarificationPayload


class SemanticQueryEvent(ContractModel):
    """表示 Agent 已生成结构化语义查询的事件。"""

    run_id: str
    sequence: int = Field(ge=1)
    occurred_at: datetime
    event_type: Literal["semantic_query"]
    payload: SemanticQuery


class SqlEvent(ContractModel):
    """表示 Agent 已生成 SQL 产物的事件。"""

    run_id: str
    sequence: int = Field(ge=1)
    occurred_at: datetime
    event_type: Literal["sql"]
    payload: SqlPayload


class QueryResultEvent(ContractModel):
    """表示查询已返回数据的事件。"""

    run_id: str
    sequence: int = Field(ge=1)
    occurred_at: datetime
    event_type: Literal["data"]
    payload: QueryResult


class VerifiedFactsEvent(ContractModel):
    """表示查询结果已完成事实校验的事件。"""

    run_id: str
    sequence: int = Field(ge=1)
    occurred_at: datetime
    event_type: Literal["verified_facts"]
    payload: VerifiedFacts


class ChartIntentEvent(ContractModel):
    """表示 Agent 已生成图表意图的事件。"""

    run_id: str
    sequence: int = Field(ge=1)
    occurred_at: datetime
    event_type: Literal["chart"]
    payload: ChartIntent


class InsightEvent(ContractModel):
    """表示 Agent 输出业务洞察的事件。"""

    run_id: str
    sequence: int = Field(ge=1)
    occurred_at: datetime
    event_type: Literal["insight"]
    payload: InsightPayload


class WarningEvent(ContractModel):
    """表示分析过程出现非阻断性问题的事件。"""

    run_id: str
    sequence: int = Field(ge=1)
    occurred_at: datetime
    event_type: Literal["warning"]
    payload: WarningPayload


class ErrorEvent(ContractModel):
    """表示分析失败或被拒绝的事件。"""

    run_id: str
    sequence: int = Field(ge=1)
    occurred_at: datetime
    event_type: Literal["error"]
    payload: StructuredError


# 根据 event_type 选择具体事件模型的联合类型。
AgentEvent: TypeAlias = Annotated[
    StatusEvent
    | ClarificationEvent
    | SemanticQueryEvent
    | SqlEvent
    | QueryResultEvent
    | VerifiedFactsEvent
    | ChartIntentEvent
    | InsightEvent
    | WarningEvent
    | ErrorEvent,
    Field(discriminator="event_type"),
]


class DemoRunRequest(ContractModel):
    """启动演示分析时提交的问题。"""

    question: str = Field(min_length=1)


class DemoRunResponse(ContractModel):
    """演示分析启动后的运行标识和事件数量。"""

    run_id: str
    event_count: int
