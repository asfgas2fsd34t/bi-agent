# Java 持有分析权威，Python 提出 Agent 候选

系统按“Python 提出候选，Java 裁决并执行”划分权责：Python 负责非确定性的理解、检索、澄清、候选生成、有限修复和表达，Java 负责身份与权限、语义版本、校验规划、安全执行、可验证事实、审计以及权威 `AnalysisRun`。相比让 Python Agent 直接编排并执行全部工具，这增加了跨语言契约和部署复杂度，但把模型输出限制在不可信候选边界内，并允许确定性工程规则独立测试和强制执行。

## Consequences

- 所有公开入口和用户可见运行状态以 Java 保存的 `AnalysisRun` 为准；Python 的 checkpoint 只保存 Agent 内部状态。
- Python 和模型不持有数据库凭据，也不能提交可信身份、权限结论或可执行 SQL。
- Java 与 Python 通过版本化契约协作，并以跨语言契约测试防止模型分别漂移。
