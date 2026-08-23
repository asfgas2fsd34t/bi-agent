# Triage 标签

工程技能使用五种标准分诊状态。下表定义标准状态到本项目 GitHub 标签的映射。

| 技能中的标准状态 | GitHub 标签 | 含义 |
| --- | --- | --- |
| `needs-triage` | `needs-triage` | 等待维护者评估 |
| `needs-info` | `needs-info` | 等待报告者补充信息 |
| `ready-for-agent` | `ready-for-agent` | 规格完整，可由 Agent 实现 |
| `ready-for-human` | `ready-for-human` | 需要人工完成 |
| `wontfix` | `wontfix` | 不会实施 |

每个已分诊 Issue 应且只能包含一个状态标签。标签发生冲突时，在继续操作前提示维护者处理。

除状态标签外，分诊后的 Issue 还应包含一个类别标签：`bug` 或 `enhancement`。
