# Governed BI Agent 产品与系统规格

> 状态：Draft，内容已经过需求访谈确认，待发布到项目 issue tracker。
>
> 目标读者：产品设计者、Java 工程师、Python Agent 工程师、前端工程师和后续实现 Agent。
>
> 本规格只整理前端原型制作之前达成的决策。原型属于后续设计参考，不构成本规格的需求来源。

## Problem Statement

企业用户希望通过自然语言分析业务数据，但传统 Text-to-SQL 方案让大模型直接生成并执行 SQL，存在指标口径漂移、错误 Join、越权访问、查询成本不可控、结果无法解释以及版本不可追溯等问题。普通聊天界面也会把 SQL、数据、图表和业务结论埋在消息流中，难以复核、复用和审计。

与此同时，不同组织拥有不同数据库结构、指标定义、业务术语、关系和权限。系统不能把电商、SaaS 或其他领域逻辑硬编码进 Agent，也不能期待大模型仅凭数据库 Schema 自动理解真实业务口径。需要一个领域可配置的平台，让用户以受治理、可版本化的方式定义业务语义，并让 Agent 只在已发布语义范围内完成分析。

本项目还承担求职作品集目标：同时展示 Java 服务端工程能力和 Python Agent 工程能力。Java 必须证明领域建模、编译、权限、安全执行、可靠性和可观测性；Python 必须证明结构化输出、上下文工程、工作流编排、修复和评估能力。两者之间必须有清晰、可测试、不能被模型绕过的边界。

## Solution

构建一个领域可配置的 Governed BI Agent。用户连接受支持的数据源后，可以导入物理 Schema，并由 AI 辅助生成领域语义包草稿。领域负责人审核指标、维度、关系、术语和策略后发布不可变版本。业务用户随后通过自然语言提问；Python Agent 将问题转换为受约束的 `SemanticQuery`，Java BI Core 对其进行权限校验、语义规划和 SQL 编译，再通过只读连接执行。Java 从结果中计算可验证事实，Python 仅基于这些事实生成业务解释。

核心链路为：

```text
自然语言问题
→ 意图识别与歧义澄清
→ 检索已发布语义上下文
→ Python 生成 SemanticQuery
→ Java 校验权限、兼容性和聚合安全
→ Java 生成 LogicalPlan 并编译参数化 SQL
→ Java 执行 EXPLAIN / 成本检查
→ Java 只读执行并计算 VerifiedFacts
→ Python 生成有证据的业务解释
→ Java 通过 SSE 发布结构化 artifacts
```

LLM 不生成或执行 Raw SQL，不定义正式指标公式，不持有数据库凭据，不决定用户权限，也不自行计算最终展示的业务数字。系统采用 Conversation-led、Artifact-first 的交互：对话用于提问、澄清和追问，结构化工作台用于展示图表、数据、指标口径、语义版本、查询信息、证据和运行轨迹。

## User Stories

1. 作为业务分析用户，我希望用自然语言提出业务问题，以便不用手写 SQL 也能分析被授权的数据。
2. 作为业务分析用户，我希望系统在业务术语存在歧义时要求我澄清，以便避免使用错误指标口径。
3. 作为业务分析用户，我希望澄清选项来自已发布语义定义，以便选择组织认可的业务概念。
4. 作为业务分析用户，我希望系统明确展示所使用的指标、维度、时间范围和比较方式，以便核对分析意图。
5. 作为业务分析用户，我希望查看查询结果的图表和数据表，以便从不同视角理解结果。
6. 作为业务分析用户，我希望查看指标业务定义和所有者，以便确认结果使用了正确口径。
7. 作为业务分析用户，我希望查看本次查询引用的语义版本，以便结果可追溯。
8. 作为业务分析用户，我希望查看系统生成的 SQL，以便在需要时审查执行逻辑。
9. 作为业务分析用户，我希望每条业务洞察都能定位到数据证据，以便验证结论而不是相信无依据文本。
10. 作为业务分析用户，我希望系统标明数据新鲜度、结果是否截断和分析限制，以便正确理解结论边界。
11. 作为业务分析用户，我希望能够继续追问“再按地区拆分”之类的问题，以便迭代分析而不必重复完整问题。
12. 作为业务分析用户，我希望追问被解释为对当前已确认 `SemanticQuery` 的结构化修改，以便保持已有指标口径和过滤条件。
13. 作为业务分析用户，我希望通过控件修改时间、维度和过滤条件，以便简单调整无需每次发起自然语言对话。
14. 作为业务分析用户，我希望保存一次分析的语义查询、语义版本和图表意图，以便日后复用。
15. 作为业务分析用户，我希望重新打开保存的分析时选择查看历史快照或按新数据重跑，以便区分历史结论与当前数据。
16. 作为业务分析用户，我希望被拒绝的请求返回清楚、可行动的原因，以便知道应该缩小范围、申请权限还是修改问题。
17. 作为业务分析用户，我希望系统拒绝它无法通过语义层表达的问题，以便不会静默降级到不受治理的 Raw SQL。
18. 作为业务分析用户，我希望系统在结果可疑或数据不足时表达不确定性，以便不会给出虚假的确定结论。
19. 作为业务分析用户，我希望查询执行失败后系统进行有限修复，以便常见的可修复错误不会直接终止分析。
20. 作为业务分析用户，我希望权限拒绝和高成本拒绝不会被 Agent 通过改写反复绕过，以便治理规则始终有效。
21. 作为业务分析用户，我希望可以点赞或点踩分析结果，以便反馈系统质量。
22. 作为业务分析用户，我希望点踩时可以选择失败类型，以便团队定位检索、语义、权限、执行或解释问题。
23. 作为 Viewer，我希望只能看到和查询被授权的语义对象，以便敏感数据不被暴露。
24. 作为 Viewer，我希望模型看不到未经授权的表、字段和样本值，以便权限在生成前就生效。
25. 作为 Viewer，我希望不同权限范围的查询缓存彼此隔离，以便缓存不会造成越权泄露。
26. 作为 Modeler，我希望导入数据源的表、列、类型、主键和外键，以便建立领域语义草稿。
27. 作为 Modeler，我希望 AI 根据 Schema 和文档生成模型、指标、维度、关系和术语草稿，以便减少手工建模成本。
28. 作为 Modeler，我希望 AI 草稿展示生成依据，以便我能判断建议是否可信。
29. 作为 Modeler，我希望在结构化编辑界面中修改语义草稿，以便不必直接编辑所有 YAML。
30. 作为 Modeler，我希望运行静态校验和编译测试，以便在发布前发现无效字段、非法关系和不兼容指标。
31. 作为 Modeler，我希望看到语义变更的影响分析，以便知道哪些已保存分析和 Golden Cases 会受影响。
32. 作为 Modeler，我希望用户在对话中提出的业务口径纠正形成 `SemanticChangeProposal`，以便正式定义不会被聊天内容自动修改。
33. 作为 Modeler，我希望用户修改后的正确语义查询进入待审核队列，以便确认后再成为 approved example。
34. 作为领域负责人，我希望已发布语义版本不可修改，以便历史查询能够稳定重放。
35. 作为领域负责人，我希望通过发布新版本来修改指标，并能够弃用旧指标，以便变化可审计且兼容历史分析。
36. 作为领域负责人，我希望在发布前执行 Golden Query 回归，以便语义变更不会无意破坏既有分析。
37. 作为领域负责人，我希望能够批准、拒绝和说明语义变更提案，以便正式口径受人工治理。
38. 作为 Admin，我希望管理数据源连接和只读凭据，以便模型和 Python 服务永远接触不到数据库密钥。
39. 作为 Admin，我希望发布、弃用和回滚语义包版本，以便运行时可以快速恢复到已知正确版本。
40. 作为 Admin，我希望配置工作区级模型、字段、行级策略和查询预算，以便平台适配不同组织的治理要求。
41. 作为 Admin，我希望查看不可变审计记录，以便追踪谁在何时访问了哪些语义对象。
42. 作为 Admin，我希望审计记录默认不保存敏感单元格值，以便可观测性本身不会成为泄露渠道。
43. 作为 Admin，我希望取消长时间运行的查询，以便保护数据库资源。
44. 作为 Admin，我希望限制用户并发、查询频率、返回行数和字节数，以便平台负载可控。
45. 作为领域包作者，我希望用同一种 DSL 定义电商、SaaS 或其他领域，以便平台内核不含领域专用代码。
46. 作为领域包作者，我希望定义数据源模型、主键、基础粒度和字段映射，以便编译器理解物理数据结构。
47. 作为领域包作者，我希望定义维度类型、枚举、格式、同义词和敏感分类，以便 Agent 检索和治理这些字段。
48. 作为领域包作者，我希望定义基础指标和比率指标，以便业务公式不由模型临时生成。
49. 作为领域包作者，我希望声明指标允许使用的维度，以便无效的分析组合在执行前被拒绝。
50. 作为领域包作者，我希望显式定义关系、连接键和基数，以便 Join Planner 能判断聚合是否安全。
51. 作为领域包作者，我希望定义业务词汇和同义词，以便自然语言能映射到稳定语义 ID。
52. 作为领域包作者，我希望定义 approved examples，以便少样本检索与回归评测使用相同的已审核知识。
53. 作为领域包作者，我希望定义角色可访问的模型、列和行过滤策略，以便权限作为语义包的一部分接受版本治理。
54. 作为 Java 工程师，我希望 Java BI Core 持有权威 `AnalysisRun`，以便运行状态、身份、权限、审计和最终产物由确定性服务控制。
55. 作为 Java 工程师，我希望 Java 根据 `run_id` 恢复真实用户上下文，以便不信任 Python 提交的租户或角色字段。
56. 作为 Java 工程师，我希望 `SemanticQuery` 只包含语义 ID 和受约束操作，以便模型无法提交任意表达式字符串。
57. 作为 Java 工程师，我希望把 `SemanticQuery` 转换为明确的 `LogicalPlan`，以便规划、策略重写和方言编译可以分别测试。
58. 作为 Java 工程师，我希望 Join Planner 只选择已批准且能证明聚合安全的路径，以便避免一对多关系造成指标膨胀。
59. 作为 Java 工程师，我希望无法证明安全的路径返回 `UNSAFE_AGGREGATION_PATH`，以便系统不会猜测性使用 `DISTINCT`。
60. 作为 Java 工程师，我希望 SQL 通过 AST/DSL 构造并参数绑定，以便用户值不会被字符串拼接到 SQL。
61. 作为 Java 工程师，我希望编译器适配 PostgreSQL 和 DuckDB 方言，以便证明语义查询与物理数据库解耦。
62. 作为 Java 工程师，我希望执行前运行 `EXPLAIN` 或等价 dry-run，以便在真实数据库层发现无效或昂贵查询。
63. 作为 Java 工程师，我希望数据库连接使用只读角色、批准的 Schema/View 和超时，以便即使上层校验有缺陷也不能写库。
64. 作为 Java 工程师，我希望工具调用使用 `run_id + step_id` 幂等，以便 Agent 节点重试不会重复发布最终结果。
65. 作为 Java 工程师，我希望查询执行适配器统一提供 explain、execute 和 cancel，以便数据源差异被封装在稳定接口后。
66. 作为 Java 工程师，我希望 Java 根据结果计算同比、环比、占比、Top N、缺失率和异常候选，以便展示数字可回算。
67. 作为 Java 工程师，我希望 Java 校验图表字段和结果形状并生成受约束配置，以便模型不能注入任意 JavaScript 或 HTML。
68. 作为 Java 工程师，我希望公开 API、SSE、认证和用户可见事件统一由 Java 提供，以便外部访问只有一个可信入口。
69. 作为 Python Agent 工程师，我希望使用有界状态图编排分类、澄清、检索、生成、修复和解释，以便每个分支、重试和终止条件可观测。
70. 作为 Python Agent 工程师，我希望 Agent 只检索 Java 已按权限裁剪的语义上下文，以便 Prompt 不包含无关或越权内容。
71. 作为 Python Agent 工程师，我希望模型先输出结构化意图，再输出 `SemanticQuery`，以便歧义和查询表达可以分别评估。
72. 作为 Python Agent 工程师，我希望 Java 返回稳定的结构化错误，以便 Agent 只针对可修复错误调整语义查询。
73. 作为 Python Agent 工程师，我希望修复最多执行两次，以便避免无限 ReAct 循环和不可控成本。
74. 作为 Python Agent 工程师，我希望 Prompt、模型、温度、语义上下文 ID 和版本进入 trace，以便问题可以复现。
75. 作为 Python Agent 工程师，我希望 LLM 仅看到脱敏预览和 `VerifiedFacts`，以便敏感或大规模结果不进入模型服务。
76. 作为 Python Agent 工程师，我希望洞察输出包含对 `VerifiedFacts` 的引用，以便 Java 能拒绝无证据数字。
77. 作为 Python Agent 工程师，我希望统一 Model Gateway 兼容 OpenAI-style API，以便默认使用国内可访问模型并保留提供商替换能力。
78. 作为前端用户，我希望对话和分析产物在同一工作流中协作，以便既能自然提问又能高效核查结果。
79. 作为前端用户，我希望 SQL、口径、语义版本和运行轨迹默认不干扰主要分析，但可随时查看，以便兼顾易用性和透明度。
80. 作为前端用户，我希望澄清问题使用结构化选项，而不是让我猜应该怎样重新组织问题。
81. 作为前端用户，我希望进度、澄清、SQL、数据、图表、洞察、警告和错误作为独立事件流式出现，以便界面无需解析大段 Markdown。
82. 作为平台维护者，我希望 Java 与 Python 共享同一个 W3C trace context，以便一次分析能够跨服务排查。
83. 作为平台维护者，我希望每个节点记录脱敏输入摘要、输出摘要、耗时、token、模型和错误分类，以便比较质量、延迟和成本。
84. 作为平台维护者，我希望线上反馈通过 `trace_id` 关联到运行轨迹，以便失败样本经审核后进入评测集。
85. 作为平台维护者，我希望固定数据快照上的 Golden Dataset 在 CI 中回归，以便 Prompt、模型和语义变化不会静默降低质量。
86. 作为求职面试官，我希望看到指标歧义被正确澄清，以便判断系统不是简单 Text-to-SQL 包装。
87. 作为求职面试官，我希望看到越权字段和昂贵查询被 Java 拒绝，以便判断安全边界不是依赖模型自律。
88. 作为求职面试官，我希望看到同一语义 DSL 支持两个不同领域，以便判断平台的通用性来自抽象而不是硬编码。
89. 作为求职面试官，我希望看到一次改动前后的评测报告，以便判断项目是否具备可持续迭代能力。
90. 作为项目使用者，我希望通过 Docker Compose 和一条启动命令运行完整演示，以便无需理解所有内部服务即可体验系统。

## Implementation Decisions

### 产品与领域边界

- 产品定位为领域可配置的 Governed BI Agent 平台，而不是电商专用应用。电商是完整参考领域，SaaS 是第二个兼容性领域；生产代码不包含电商专用判断。
- 第一版支持 PostgreSQL 和 DuckDB。领域通用性与数据源通用性分开解决，不承诺任意数据库、CSV、Excel、API 或联邦查询。
- 用户连接数据源后，Java 导入物理 Schema，Python AI 生成语义模型 Draft，Java 校验引用与关系，用户审核后发布。AI 不自动发布业务定义。
- 解释性文档可直接进入检索索引；指标公式、Join 和权限等执行性知识必须转换为结构化 Draft 并审核。文档与已发布结构化定义冲突时，以已发布语义包为准。
- 第一版支持三个角色：Viewer 查询被授权对象；Modeler 创建和修改 Draft；Admin 管理数据源并发布、回滚语义版本。
- 数据模型从第一天包含 `workspace_id` 并实现工作区级隔离，但演示部署只预置一个工作区，不实现完整 SaaS 组织、邀请和计费体系。

### 语义包与版本治理

- `semantic-packages` 概念是业务语义的唯一权威来源。UI 是编辑入口；数据库保存已发布的不可变运行快照；检索索引保存派生表示，不是权威事实来源。
- Java 定义并实现语义 DSL 规则；领域作者使用 DSL 定义具体业务；Python 只引用已发布语义 ID，不定义正式业务公式。
- 语义包至少表达 Source、Model、Dimension、Metric、Relationship、Glossary、Policy 和 Approved Example。
- Model 定义物理来源、主键、基础粒度和字段映射。Dimension 定义来源字段、类型、枚举/格式、同义词和敏感分类。
- 第一版 Metric 支持 `SUM`、`COUNT`、`COUNT DISTINCT`、`AVG`、两个指标之间的比率，以及时间粒度、同比和环比。Metric 声明基础粒度和允许维度。
- 第一版不允许任意 SQL 指标、表达式字符串、自定义脚本、窗口函数、漏斗或留存 DSL。无法表达的业务问题被明确拒绝并进入 DSL 演进队列。
- Relationship 显式声明两端、连接键、方向、基数和是否允许。规划器只选择已批准路径。
- Policy 定义角色允许访问的模型/字段及行过滤。权限在生成前裁剪上下文，在执行前由 Java 和数据库重新强制执行。
- 发布生命周期为 Draft、静态校验、编译测试、Golden Query 回归、人工批准、Published、Deprecated。
- Published 版本不可修改，只能创建新版本；指标不能直接删除，只能弃用。已保存分析固定语义版本，旧版本在保留期内可重放。第一版不自动迁移历史分析。
- 用户在对话中纠正口径时生成 `SemanticChangeProposal`。当前对话若基于临时假设继续，必须明确标记；正式语义只能经审核发布后改变。

### SemanticQuery 与编译

- Python 输出 `SemanticQuery`，不输出 Raw SQL。`SemanticQuery` 使用版本化 JSON Schema，只允许语义成员 ID、过滤操作、时间范围、比较、排序和限制等受约束字段。
- `SemanticQuery` 不允许模型提交公式、物理表列、Join 条件、租户条件或任意 SQL 表达式。
- Java 编译链为 `SemanticQuery → LogicalPlan → Join Planner → Aggregate Planner → Policy Rewriter → SQL AST → Dialect SQL`。
- 第一版使用轻量自研语义 DSL 和逻辑计划，参考 Cube/Wren 概念但不依赖其运行时。SQL 使用 jOOQ AST 或等价类型安全 DSL 构造，不使用字符串拼接。第一版不引入 Apache Calcite。
- Join Planner 根据基础粒度和基数证明聚合安全。无法证明时返回 `UNSAFE_AGGREGATION_PATH`，不猜测性注入 `DISTINCT`。
- 用户值通过参数绑定进入 SQL。方言显式指定。编译器只生成单条只读查询。
- SQL AST 校验仍作为纵深防御存在，但不是主要 NL2SQL 路径，也不能替代数据库权限、语义正确性或真实引擎校验。

### Java 与 Python 的权责

- Java 21 + Spring Boot 3 负责公开 API、认证、用户/工作区上下文、语义 DSL、语义版本、规划编译、策略、执行、VerifiedFacts、artifact 校验、SSE、审计和权威 `AnalysisRun`。
- Python + FastAPI + LangGraph + Pydantic 负责问题分类、歧义判断、多轮澄清、语义检索、结构化意图、`SemanticQuery` 候选、有限修复、ChartIntent 和基于证据的自然语言表达。
- 原则是“Python 提出候选，Java 裁决并执行”。Python 的所有输出均视为不可信候选。
- Java 保存权威 `AnalysisRun`，包含用户、工作区、状态、权限、审计和最终 artifacts。Python checkpoint 保存 Agent 内部状态，包含问题、澄清、检索上下文、候选查询和修复次数。
- 所有公开入口经过 Java。Python 仅在内网提供内部 Agent 接口，并调用 Java 暴露的受控工具接口。
- Python 不能提交可信身份字段。Java 必须根据 `run_id` 恢复用户和策略上下文，并重新校验每次工具调用。
- 每个工具调用携带 `run_id + step_id`，Java 按 `step_id` 保证幂等。服务重启后允许节点级恢复，不承诺分布式 Exactly Once。
- Java 和 Python 通过版本化 JSON Schema/OpenAPI 契约协作，核心契约至少包括 `SemanticQuery`、`AnalysisRun`、`AgentEvent`、`QueryResult`、`VerifiedFacts`、`ChartIntent` 和 `StructuredError`。
- Java DTO 与 Python Pydantic 模型应从契约生成或接受跨语言契约测试，避免分别演化。

### Agent 状态与行为

- Agent 是单 Agent、有界状态机，不拆分为 SQL Agent、Chart Agent 和 Insight Agent。只有当未来存在不同权限、独立上下文或可证明并行收益时才考虑多 Agent。
- 状态图覆盖：分类/澄清、上下文检索、意图规划、SemanticQuery 生成、Java 校验、可修复错误处理、执行、结果验证、ChartIntent 和洞察表达。
- 以下情况必须澄清：术语映射到多个指标；缺少不能安全默认的时间范围；指标与粒度不兼容；存在多个合法但含义不同的 Join 路径；“最好”“增长最快”等比较口径不明确。
- 普通展示偏好可以使用默认值，但必须写入 `assumptions` 并在结果中可见。
- Java 使用稳定错误分类与 Python 协作，至少包括 `UNKNOWN_METRIC`、`INCOMPATIBLE_DIMENSION`、`AMBIGUOUS_JOIN`、`UNSAFE_AGGREGATION_PATH`、`POLICY_DENIED`、`INVALID_TIME_RANGE`、`QUERY_TOO_EXPENSIVE`、`DATABASE_ERROR` 和 `RESULT_TRUNCATED`。
- Python 只对标记为可修复的错误重新生成 `SemanticQuery`，最多两次。权限拒绝和预算拒绝不可修复。
- 多轮追问绑定明确的 `AnalysisContext` 和上一条已确认 `SemanticQuery`。增删维度、过滤和比较优先表达为结构化查询变更，而不是让模型重写整个查询。
- Model Gateway 兼容 OpenAI-style API。默认配置国内可访问模型，并允许替换提供商；第一版不实现复杂动态模型路由或本地模型质量承诺。

### 安全、策略与执行

- Python 和模型永远不持有数据库凭据。凭据只存在于 Java 执行服务的受控配置中。
- 数据库使用独立只读角色，只授权批准的 Schema/View。敏感行列优先通过数据库 RLS 或安全 View 强制执行。
- Java 在执行前校验单条只读语句、批准对象、字段权限、危险函数、Join 深度、时间范围和服务端限制。
- Java 通过 PostgreSQL `EXPLAIN`、DuckDB 等价计划能力或数据仓库 dry-run 执行真实引擎校验，并设置 statement timeout、lock timeout、扫描/成本阈值和最大 Join 数。
- 执行层实施 row cap、byte cap、取消、并发限制和 rate limit。Python 重试不能修改或绕过这些限制。
- 查询执行适配器提供统一 `explain`、`execute`、`cancel` 行为，返回类型化 Schema、行、行数、截断状态、耗时和数据库 query ID。
- 缓存键至少包含 workspace、语义版本、规范化 `SemanticQuery`、数据 freshness token 和权限范围。优先缓存查询结果和 `VerifiedFacts`，不缓存整个自然语言回答。
- Prompt injection 防御依赖系统边界而非模型服从：文档、数据库值和检索内容均标记为不可信数据；不把任意原文拼入系统指令；Java 不执行 Python 提供的 SQL；所有工具参数重新校验。
- 审计记录包含用户、工作区、语义版本、SQL hash、策略决策、访问对象、耗时、行数和错误类型。默认不记录敏感单元格值。
- 用户错误分为用户层和调试层。用户层提供简洁原因和可采取动作；调试层提供稳定错误代码、失败节点、trace ID 和脱敏详情。

### 结果、图表与洞察

- Java 从查询结果确定性计算 `VerifiedFacts`，包括同比、环比、占比、Top N、缺失率和异常候选。LLM 不自行计算或引入结果中不存在的数字。
- Python 只输出受约束的 `ChartIntent`，例如趋势、比较、构成及使用字段。Java 校验字段存在性和结果形状，并生成受 JSON Schema 约束的 ECharts 配置。
- 禁止模型输出或执行任意 JavaScript、HTML、Python 或图表 formatter。
- Python 生成洞察时默认只看到字段定义、脱敏且截断的预览、`VerifiedFacts`、行数、缺失率和截断状态。PII 与完整大结果默认不进入 Python 或模型 API。
- 每条洞察引用事实或证据，至少包含 claim、evidence、query/run 标识和 limitation。所有展示数字必须可由结果回算。
- Java 通过 SSE 发布 typed events。事件至少区分状态、澄清、语义查询、SQL、数据、图表、洞察、警告和错误，前端不解析大段 Markdown 来恢复结构。

### 交互与保存

- 产品采用 Conversation-led、Artifact-first，而不是纯 Chat-first。对话是意图入口，分析工作台是结果主载体。
- 对话承担提问、澄清和追问；工作台承担图表、数据、口径、语义版本、SQL、证据和运行轨迹。
- 语义建模使用独立 Semantic Studio。AI 在其中生成 Draft 和解释错误，结构化编辑、校验、影响分析、测试、批准、发布和回滚不能只通过聊天完成。
- SQL、口径、语义版本和运行轨迹可核查但不默认占据主要视觉层级。
- `Save Analysis` 保存原始问题、确认后的 `SemanticQuery`、语义版本和 ChartIntent。重新打开时允许查看历史快照或按当前数据重跑。
- 第一版只支持简单已保存分析列表，不实现自由布局 Dashboard。

### 可观测性与评估

- Java 使用 Micrometer/OpenTelemetry，Python 使用 OpenTelemetry 并接入 Langfuse。两端传播 W3C `traceparent`，并共享 `trace_id`、`run_id` 和 `step_id`。
- 每个状态图节点记录脱敏输入/输出摘要、Prompt/模型/版本、语义上下文 ID、SQL hash、工具结果、token、耗时和错误分类。
- Golden Dataset 使用固定数据快照，第一版约 100 条：约 70 条电商和 30 条 SaaS。
- 每条评测案例至少包含问题、期望意图、期望 `SemanticQuery`、允许的澄清行为、期望执行结果、期望策略决策和推荐图表类型。
- 主要正确性指标是 `SemanticQuery` 与执行结果，不使用 exact SQL match 作为主指标。
- 发布质量门槛：`SemanticQuery` Schema 有效率 100%；主评测集结果正确率至少 90%；高风险越权和写操作阻断率 100%；图表字段有效率 100%；洞察数字可回算率 100%；P95 端到端延迟不超过 15 秒；每次分析最多两次模型修复。
- 评估按意图/澄清、检索、语义查询、执行结果、安全、图表、洞察和系统性能分层报告，以便区分失败原因。
- 点赞只记录质量信号；点踩记录失败类型；用户纠正和修改后的 `SemanticQuery` 进入待审核队列。只有人工批准后才能进入 approved examples 和 Golden Dataset。

### 部署与工程组织

- 使用 Monorepo 管理前端、Java 服务、Python 服务、契约、语义包、数据集、评测、基础设施和文档。
- Java 使用 Maven，Python 使用 `uv`，前端使用 pnpm。根级任务提供统一 lint、test、eval、build 和启动入口。
- 第一版前端采用 React + TypeScript + Vite，图表使用 ECharts，数据表使用成熟的虚拟化表格组件。公开 API 和鉴权由 Java 提供，不增加 Next.js 服务层。
- 第一版唯一必需的持久基础设施是 PostgreSQL，可同时承担平台状态、Agent checkpoint、审计、反馈和 pgvector 检索。DuckDB 是离线业务数据源适配器，不保存平台状态。
- Redis、Kafka、Elasticsearch 和对象存储不是第一版必需依赖。
- Docker Compose 提供完整本地启动；公开环境仅部署模拟数据和预置角色，不开放自由注册或真实企业数据。
- CI 执行 lint、单元测试、契约测试、Testcontainers 集成测试、Golden Dataset 回归、镜像构建和依赖/安全扫描。评测低于门槛阻止发布。
- 代码、类名、API 和架构图使用英文；面向国内求职的 README 和演示以中文为主，并可补充英文摘要。
- 项目以 MIT 或 Apache-2.0 开源，不提交模型密钥或第三方敏感数据。

### 八周交付节奏

- 第 1 周：跨语言契约、核心领域模型和固定数据集。
- 第 2 周：Java 语义包加载、静态校验、发布模型。
- 第 3 周：LogicalPlan、Join Planner、聚合规划和 SQL 编译。
- 第 4 周：Java 执行、权限、审计、AnalysisRun 和 SSE。
- 第 5 周：Python Agent、检索、澄清、SemanticQuery 生成和有限修复。
- 第 6 周：对话式分析工作台和 Semantic Studio。
- 第 7 周：Golden Dataset、跨服务 trace、安全集和回归流水线。
- 第 8 周：Docker Compose、公开演示、90 秒视频、文档和性能修正。
- 每周结束都必须有可运行纵向切片，不能等到前后端全部完成后才首次联调。

## Testing Decisions

### 主要测试缝

- 最高层、主要验收缝是公开 `AnalysisRun` 接口：给定用户/工作区身份、自然语言问题、已发布语义版本和固定业务数据快照，系统通过 SSE 产出澄清或最终 typed artifacts。测试使用确定性 Model Gateway 替身，覆盖 Java、Python、契约、状态编排、权限、编译和 artifact 组装的完整行为。
- 这一缝只断开非确定性的外部模型调用和第三方追踪后端，不 mock Java/Python 之间的业务契约、语义编译器或真实 PostgreSQL 执行。
- 由于当前仓库只有原型、尚无既有测试先例，后续实现应优先建立这一个端到端 harness，再增加不能通过高层测试精确定位或穷举的下层确定性测试。

### 外部行为测试原则

- 测试用户可观察的状态、事件、策略决策、编译结果和执行结果，不断言内部方法调用次数、私有类结构、Prompt 的无关措辞或 LangGraph 节点实现细节。
- 对同一语义查询允许不同但等价的 SQL 文本；主要断言 LogicalPlan 语义、绑定参数、访问对象和执行结果。
- 固定测试时间、时区、数据快照、随机种子、语义版本和模型响应，以保证可重复。
- 错误测试断言稳定错误代码、是否可修复和用户可行动信息，不依赖数据库驱动的原始错误文本。
- 安全测试必须使用真实数据库只读角色和真实权限配置，不能只 mock 权限结果。

### Java 测试

- 语义 DSL 解析和验证：非法引用、重复 ID、无效公式、维度兼容性、弃用成员和版本不变性。
- Join Planner 与 Aggregate Planner：一对一、多对一、一对多、多个候选路径、循环和无法证明安全的聚合路径。
- SQL 编译器：PostgreSQL/DuckDB 方言、参数绑定、时间粒度、同比/环比、排序、Top N、NULL 和时区。
- Policy Rewriter：工作区、角色、模型/字段 allowlist、行过滤、危险操作和不可绕过查询预算。
- Testcontainers 集成：真实 PostgreSQL 语法、只读权限、RLS/View、EXPLAIN、超时、取消、行数限制和幂等工具调用。
- VerifiedFacts：同比、环比、占比、Top N、缺失率和数字回算。
- Artifact 校验：ChartIntent 与结果字段兼容、图表 Schema 有效、无任意脚本字段。
- 语义发布：Draft 校验、回归失败、不可变 Published、弃用、回滚和已保存分析版本固定。

### Python 测试

- 对每个 Agent 节点使用结构化输入/输出测试，覆盖分类、澄清、检索、意图生成、SemanticQuery 生成、错误修复和洞察表达。
- 验证必须澄清与不必要澄清的边界；追问应生成结构化 query patch，而不是丢失既有上下文。
- 检索测试计算指标、维度、关系和 approved example 的 recall@k，并验证越权对象从上下文中消失。
- 修复测试验证最多两次、只修复允许错误、不得对 `POLICY_DENIED` 或 `QUERY_TOO_EXPENSIVE` 重试。
- 洞察测试验证所有数字引用 `VerifiedFacts`，不能凭预览行自行创造数字。
- Prompt injection 测试把恶意指令放入文档和数据库字段值，验证其不改变工具权限和 SemanticQuery Schema。

### 契约、端到端与评测

- 对 Java 和 Python 运行同一份 JSON Schema/OpenAPI 兼容性测试，并在 CI 阻止不兼容契约变更。
- 端到端场景至少覆盖：指标歧义澄清、成功分析、追问增加维度、越权字段拒绝、昂贵查询拒绝、数据库可修复错误、不可安全 Join、结果截断和服务重启后的节点恢复。
- Golden Dataset 在固定数据快照执行，分别报告电商与 SaaS，证明领域通用性并识别单领域过拟合。
- 安全集包含 DDL/DML 请求、越权列、租户伪造、Prompt injection、危险函数、超大时间范围、过多 Join 和缓存隔离。
- 前端 E2E 验证 typed SSE events 能稳定呈现澄清、数据、图表、洞察、警告和错误，并能查看口径与语义版本；不通过像素级截图测试锁死具体布局。
- 性能测试报告 p50/p95 延迟、模型调用次数、token/成本、重试率、数据库耗时和超时率。

## Out of Scope

- Python 或 LLM 直接生成并执行 Raw SQL。
- 任意 Python、JavaScript、HTML 或用户代码执行。
- 自动发布 AI 生成的指标、关系或权限定义。
- 任意 SQL 指标、窗口函数、漏斗、留存和自定义脚本 DSL。
- 任意数据库、CSV/Excel/API 数据源和跨源联邦查询。
- 多 Agent 协作、开放式 ReAct 循环和复杂模型路由。
- 模型微调和第一版本地模型质量保证。
- 自由布局 Dashboard、自动发送邮件或自动修改现有 Dashboard。
- 企业 SSO、复杂组织邀请、计费和完整公网多租户 SaaS。
- Kubernetes、服务网格和为了展示规模而引入的分布式基础设施。
- 自动迁移已保存分析到新语义版本。
- 对未经审核的用户反馈进行自动学习或写入 approved examples。
- 在公开演示环境连接真实企业数据或开放自由注册。

## Further Notes

- 项目成功优先级为：结果与指标可靠性、Agent 评估和可观测性、可部署工程能力、视觉演示效果。
- 求职定位为 Java/Python 平衡但 Java 约占 60%。简历叙事应强调：Python 负责 Agent 能力，Java 负责可信语义执行和平台工程。
- 90 秒演示主线应包含：歧义澄清、成功 SemanticQuery 编译与可信结果、结构化追问、越权或昂贵查询拒绝及 trace/policy 原因。
- 当前交互原型是在本规格决策之后产生的参考产物。实现可以借鉴，但不应把原型内部结构当作稳定 API 或直接提升为生产代码。
- 当前工作区尚未初始化 Git，也没有配置 issue tracker 或 `ready-for-agent` 标签。因此本规格暂时只能落为本地文档，不能完成 `to-spec` 要求的 tracker 发布。应运行 `/setup-matt-pocock-skills` 完成 tracker、标签和文档布局配置后，再把本规格发布为带 `ready-for-agent` 标签的项目 issue。
- 规格发布后，下一步使用 `/to-tickets` 拆成阻塞关系明确的纵向 tracer-bullet tickets；不要按“先做完所有 Java，再做所有 Python，再做前端”的水平层拆分。
