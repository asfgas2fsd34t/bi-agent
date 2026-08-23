# 版本化契约

`schemas/v1` 是 Java、Python 和 Web 公共边界的唯一事实来源。`fixtures/v1` 下的 fixtures 由三端测试共同使用，因此契约变更会在服务发布前被所有消费者发现。

当前 v1 版本保持前端优先设计中的事件名称稳定，并补充以下公共模型：`AnalysisRun`、`StructuredError`、`QueryResult`、通用 `VerifiedFacts` 和可扩展 `ChartIntent`。SQL 只是事件中的产物载荷，不属于 Agent 的直接输出契约。

`VerifiedFacts` 只描述可回算的事实集合和数据时间，不绑定某个页面的卡片；页面若需要“总指标”“领先项”等布局，应在展示层按事实 `key` 做映射。
