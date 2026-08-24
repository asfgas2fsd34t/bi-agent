# 受治理的 BI Agent

这是一个将 Java 工程能力与 Python Agent 能力分层的 BI Agent 最小运行基线。跨服务边界由 `contracts/schemas/v1` 中的 JSON Schema 固定。Web 使用 Vue 3 + TypeScript，Java BI Core 负责运行时权威和事件存储，Python Agent 只提交结构化候选结果。

## 本地启动

需要安装 Docker、Node.js/pnpm、Java 21、Maven 和 uv。完整启动命令会启动 Web、Java BI Core、Python Agent 和 PostgreSQL，并等待服务健康：

```bash
pnpm services:up
```

停止所有服务：

```bash
pnpm services:down
```

启动后打开 `http://127.0.0.1:4173`。在 Compose 环境中，Web 只调用 Java 的 `/api/v1/demo/runs`。Java 调用 Python 的 `/v1/demo/runs`，Python 再把示例 `AgentEvent` 转发到 Java 的 `/api/v1/internal/events`，Web 最后从 Java 的 `/api/v1/runs/{run_id}/events` 读取并渲染状态。

## 契约与测试

同一组 `contracts/fixtures/v1` 由三种语言共同消费和校验：TypeScript 使用 Ajv，Python 使用 Pydantic + JSON Schema，Java 使用 Jackson：

```bash
pnpm test:contracts
```

CI 配置位于 `.github/workflows/ci.yml`，当前会执行 Web 测试、类型检查、Lint 和构建，以及 Python pytest 和 Java Maven 测试。
