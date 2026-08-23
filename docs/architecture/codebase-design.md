# Codebase Design

> 状态：Initial baseline。本文把产品规格和 ADR 转换为可实现的代码库结构；具体 Interface 随对应 Ticket 冻结，但不得绕过本文定义的权责和依赖方向。

## 设计目标

- 让 Vue、Java 和 Python 围绕同一份版本化契约协作，而不是分别维护相似 DTO。
- 让复杂的语义治理、查询规划和 Agent 工作流藏在少量深 Module 后面。
- 让调用者和测试跨越同一个 Seam，测试可观察行为而不是内部类或 LangGraph 节点。
- 只在行为确实需要替换时定义 Adapter，避免为了“可扩展”提前创建浅 Interface。

## 技术基线

| 范围 | 第一版选型 | 用途与重新评估条件 |
| --- | --- | --- |
| Web | Vue 3、TypeScript、Vite、pnpm | 构建分析工作台与 Semantic Studio；只有目标岗位或团队生态显著变化时才重新评估框架。 |
| Web 状态与路由 | Pinia、Vue Router | 保存界面状态和路由；AnalysisRun 的权威状态仍来自 Java。 |
| 可视化 | ECharts、成熟的虚拟化表格 | 展示受约束图表与大结果预览；具体表格库在实现 Ticket 中选择。 |
| Java | Java 21、Spring Boot 3、Maven、jOOQ | 承担权威运行、语义治理、规划编译、安全执行、审计和 SSE。 |
| Python | Python、FastAPI、LangGraph、Pydantic、uv | 承担有界 Agent 工作流、结构化生成、检索、修复与表达。 |
| 契约 | OpenAPI、JSON Schema | 生成或校验 TypeScript、Java 和 Python 类型；不手工复制核心模型。 |
| 平台数据 | PostgreSQL、pgvector | 保存平台状态、checkpoint、审计、反馈和检索派生数据。 |
| 业务数据 Adapter | PostgreSQL、DuckDB | 证明 SemanticQuery 与物理方言解耦；第一版不做跨源联邦查询。 |
| 流式交互 | Java 管理的 typed SSE | 对外发布有序 AgentEvent；仅最终自然语言洞察允许 token 增量。 |
| 可观测性 | OpenTelemetry、Micrometer、Langfuse | 以 trace_id、run_id 和 step_id 关联跨进程行为。 |
| 本地运行 | Docker Compose | 提供可复现的完整演示环境，不提前引入 Kubernetes。 |

这些是可演进的实现基线，不等同于 ADR。只有难以逆转、缺少背景会令人意外且来自真实取舍的变化，才新增或替代 ADR。

## Monorepo 布局

```text
/
├── apps/
│   ├── web/                 # Vue 3
│   ├── bi-core/             # Java 21 / Spring Boot
│   └── agent/               # Python / FastAPI / LangGraph
├── contracts/
│   ├── public/              # 浏览器可见的 OpenAPI 与 AgentEvent Schema
│   ├── internal/            # Java ↔ Python Interface
│   └── schemas/             # SemanticQuery、VerifiedFacts 等共享 Schema
├── semantic-packages/       # 电商与 SaaS 参考语义包
├── datasets/                # 固定演示数据快照
├── evals/                   # Golden Dataset、评测运行器与报告
├── infra/                   # Docker Compose 与本地配置
├── docs/
└── prototype/               # 只作设计参考，不被生产代码依赖
```

第一版每种语言保持一个可部署应用，不为了展示架构而拆分更多进程。应用内部按业务 Module 组织，而不是按 `controllers/services/repositories` 技术层横切。

## Module Map

### Web

**Analysis Workspace Module**

Interface 面向页面动作和可观察状态：创建分析、提交澄清、应用 Query Patch、取消运行、读取快照和订阅 AgentEvent。它隐藏事件归并、断线恢复、Artifact 索引、加载/拒绝/失败状态以及对话与工作台的同步规则。

该 Module 使用 `AnalysisRunSource` Seam，并提供两个真实 Adapter：

- `FixtureAnalysisRunSource`：为 Fixture Lab 确定性地产生完整场景。
- `HttpSseAnalysisRunSource`：调用 Java 并消费 typed SSE。

页面、Pinia store 和 Story/Fixture 不得直接解析 SSE 或自行拼装 AnalysisRun。

**Semantic Studio Module**

Interface 面向语义草稿的加载、编辑、校验、影响分析、审核和发布状态。它隐藏编辑表单与 YAML 表示的转换、校验问题定位和版本差异；不能把聊天消息当作正式语义修改。

### Java BI Core

**Analysis Runtime Module**

Interface 接受用户命令并返回权威结果：开始 AnalysisRun、提交澄清、应用 Query Patch、取消、读取快照和观察 AgentEvent。它隐藏身份恢复、状态转换、幂等、Agent 调用、查询执行、Artifact 组装、持久化、审计和事件顺序。

Interface invariants：

- 调用者身份和 Workspace 由 Java 恢复，不能信任请求中的角色或租户字段。
- 同一 `run_id + step_id` 的重复命令产生相同结果，不重复发布最终 Artifact。
- AgentEvent 在单个 AnalysisRun 内有稳定序号；终态后不再接受会改变结果的命令。
- 取消、权限拒绝和预算拒绝是权威状态，Python 不能通过重试覆盖。

**Semantic Governance Module**

Interface 提供 Draft 校验、发布、弃用、版本读取和按主体裁剪的语义上下文。它隐藏 DSL 解析、引用检查、兼容性、Golden Query 门禁、不可变快照、策略裁剪和检索索引派生。

已发布 Semantic Version 是该 Module 的事实来源；pgvector 索引、文档和 AI Draft 都是派生或待审核数据。

**Governed Query Engine Module**

核心 Interface 接受 `SemanticQuery + RunContext`，返回成功的 `QueryOutcome` 或稳定的 `StructuredError`。它隐藏以下完整实现链：

```text
SemanticQuery
→ semantic and policy validation
→ LogicalPlan
→ safe Join and aggregation planning
→ policy rewrite
→ jOOQ AST and bound parameters
→ explain and budget check
→ read-only execution
→ VerifiedFacts
```

调用者不直接调用 Join Planner、Policy Rewriter 或 SQL compiler；这些是 Module 内部 Seam，只在需要精确穷举算法时增加内部测试。

该 Module 使用 `QueryDataSource` Seam。PostgreSQL 与 DuckDB 是两个生产 Adapter，测试使用真实引擎或 Testcontainers 验证方言、只读权限、EXPLAIN 和取消，不用字符串 SQL mock 代替数据库行为。

**Artifact Policy Module**

Interface 接受查询结果、VerifiedFacts 和不可信的 ChartIntent/洞察候选，返回可发布 Artifact 或稳定拒绝。它隐藏字段存在性、结果形状、数字证据引用、脱敏、截断和图表 Schema 校验。

### Python Agent

**Bounded Agent Workflow Module**

Interface 接受一次 Agent turn 的问题、AnalysisContext 和可恢复 checkpoint，返回澄清、SemanticQuery 候选、ChartIntent、证据化洞察或终止结果。它隐藏 LangGraph 节点、Prompt、检索策略、模型选择、修复计数和 checkpoint 细节。

Interface invariants：

- 输出始终通过版本化 Pydantic/JSON Schema 校验。
- 只引用 Java 返回的授权语义成员，不接触数据库凭据或任意 SQL。
- 只修复 Java 标记为可修复的错误，最多两次。
- 洞察中的数字必须引用 VerifiedFacts；预览行不是新的事实来源。

该 Module 使用两个 Seam：

- `JavaToolsPort`：Java 是远程但自有的依赖，生产使用 HTTP Adapter，测试使用内存 Adapter。
- `ModelGateway`：模型提供商是真实外部依赖，生产使用 OpenAI-style Adapter，测试和评测使用确定性 Adapter。

LangGraph 节点是实现细节，不为每个节点定义公开 Interface，也不把普通函数包装成多个 Agent。

## 跨进程 Interface

### Browser to Java

公开 Interface 只暴露 AnalysisRun 和 Semantic Studio 所需命令、快照及 typed AgentEvent。浏览器不调用 Python，不接收模型凭据，也不根据 Markdown 推断状态。

事件至少包含 `run_id`、单调递增的 `sequence`、`event_type`、`occurred_at` 和与类型匹配的 payload。重连使用最后确认的 sequence 恢复，重复事件由 Web Module 幂等归并。

### Java to Python

Java 以 `run_id`、`step_id` 和最小必要输入启动或恢复 Agent turn；Python 返回不可信候选，并通过受控 JavaToolsPort 获取授权语义上下文、提交 SemanticQuery 校验/执行和读取脱敏结果。两端传播 W3C trace context。

跨进程失败必须映射成稳定 StructuredError，不向产品 Interface 泄漏 HTTP 客户端、数据库驱动或模型 SDK 的原始异常。

### Contract ownership

`contracts/` 是跨语言 Interface 的唯一来源。契约变更顺序为：先修改 Schema 和兼容性测试，再生成或更新语言模型，最后修改 Adapter 和 Module implementation。核心类型至少包括：

- SemanticQuery、QueryPatch、AnalysisContext
- AnalysisRun、AgentEvent、Artifact
- QueryResult、VerifiedFacts、ChartIntent
- StructuredError、ClarificationRequest

## 依赖方向

```text
Vue pages
  → Web Modules
    → generated public contracts
      → HttpSse / Fixture Adapters

Java transport and persistence Adapters
  → Analysis Runtime
    → Semantic Governance
    → Governed Query Engine
    → Artifact Policy
    → AgentPort

Python FastAPI Adapter
  → Bounded Agent Workflow
    → JavaToolsPort
    → ModelGateway
```

- 业务 Module 不依赖 Spring Controller、FastAPI route、Vue page 或供应商 SDK 类型。
- Java 是公开入口；Vue 和外部调用者不能绕过它访问 Python。
- Python 不复制 Java 的治理规则。Python 可以提出候选，Java 必须重新裁决。
- `prototype/`、Fixture 和 eval 数据可以依赖契约，生产 Module 不得反向依赖它们。

## Interface 与测试表面

| 测试范围 | 跨越的 Interface | 保留的真实行为 | 允许替换的 Adapter |
| --- | --- | --- | --- |
| Web 交互 | Analysis Workspace Module | 事件归并、状态转换、Artifact 呈现 | FixtureAnalysisRunSource |
| Java 查询内核 | Governed Query Engine | DSL、规划、策略、jOOQ、VerifiedFacts | PostgreSQL/DuckDB 测试实例 |
| Python 工作流 | Bounded Agent Workflow | 分类、澄清、检索、修复、证据约束 | 确定性 ModelGateway、内存 JavaToolsPort |
| 跨语言契约 | contracts Schema | 编解码、枚举、兼容性 | 不替换契约本身 |
| 端到端 | 公开 AnalysisRun Interface | Vue/Java/Python、真实 PostgreSQL、SSE | 仅模型提供商与外部追踪后端 |

测试断言 Interface 的结果、状态和错误，不断言内部方法调用、类数量、Prompt 的无关措辞或精确 SQL 文本。内部实现重构不应迫使 Interface 测试重写。

## 暂不创建的抽象

- 不创建通用 `BaseService`、`BaseRepository`、`AbstractController` 或跨语言工具箱。
- 不为唯一的 PostgreSQL 平台存储提前定义可替换 Repository Seam；先将持久化作为 Analysis Runtime 和 Semantic Governance 的内部实现。
- 不引入 Event Bus Interface；第一版 AgentEvent 由 Analysis Runtime 直接持久化并通过 SSE 发布。
- 不把每个 LangGraph 节点、规划步骤或 ECharts 配置器暴露成外部 Interface。
- 不创建通用“任意数据源”模型；只有 PostgreSQL 和 DuckDB 的共同能力进入 QueryDataSource Interface。

## 首个纵向切片

1. Ticket #2 在 `apps/web` 建立 Vue 3 产品外壳、Analysis Workspace Module 和 FixtureAnalysisRunSource。
2. Ticket #3 冻结最小 public/internal contracts，并建立三个应用的生成与契约测试基线。
3. Ticket #4 只使用 Fixture 展示首条 SemanticQuery、进度、数据、图表与洞察交互。
4. Ticket #5 用 HttpSseAnalysisRunSource 替换 Fixture Adapter，接通 Java Analysis Runtime、Python Workflow 和一条受治理查询。

这个顺序使前端交互先被验证，同时保证 Fixture 与真实后端跨越同一个 AnalysisRunSource Seam，不需要在联调时重写页面。
