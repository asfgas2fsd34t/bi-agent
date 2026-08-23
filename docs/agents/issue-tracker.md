# Issue Tracker：GitHub

本项目的需求、规格和开发任务使用 `asfgas2fsd34t/bi-agent` 仓库的 GitHub Issues 管理，所有操作通过 `gh` CLI 完成。

## 基本操作

- 创建 Issue：使用 `gh issue create`。
- 读取 Issue：使用 `gh issue view <number> --comments`，并读取正文、评论和标签。
- 查询 Issue：使用 `gh issue list`。
- 添加评论：使用 `gh issue comment`。
- 修改标签：使用 `gh issue edit`。
- 关闭 Issue：使用 `gh issue close`。

## 技能约定

当技能要求“发布到 Issue Tracker”时，创建 GitHub Issue。

当技能要求“读取相关 Ticket”时，使用 `gh issue view` 读取 Issue 正文、评论和标签。

裸编号（例如 `#42`）默认解析为 GitHub Issue。若用户明确说明它是 Pull Request，再使用 `gh pr` 操作。

## Pull Request

Pull Request 不作为分诊请求入口。除非用户明确指定，否则 `triage` 不主动扫描外部 Pull Request。

## 任务关系

优先使用 GitHub Sub-issues 表达任务归属，使用原生 Issue Dependencies 表达阻塞关系。

创建阻塞关系时，依赖 API 使用的是阻塞 Issue 的数据库数字 ID，不是 Issue 编号或 GraphQL node ID。

如果仓库未启用 Sub-issues 或原生 Dependencies，则在子 Issue 正文中使用任务列表和 `Blocked by: #<number>` 作为兼容方案。所有阻塞项关闭后，Ticket 才视为可执行。

## Wayfinder 约定

- Map 使用一个带 `wayfinder:map` 标签的 GitHub Issue。
- 子决策使用 Sub-issues；不可用时加入 Map 正文的任务列表，并在子 Issue 中写明 `Part of #<map>`。
- 子决策类型使用 `wayfinder:research`、`wayfinder:prototype`、`wayfinder:grilling` 或 `wayfinder:task` 标签。
- Claim 一个 Ticket 时，将它分配给当前执行者；解决后记录答案、关闭 Issue，并把结论链接回 Map。
