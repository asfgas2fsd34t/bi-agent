# Atlas BI Web

Vue 3 产品外壳与 Fixture Lab。当前应用不依赖 Java、Python 或数据库。

在仓库根目录安装依赖后，使用一条命令启动：

```powershell
pnpm dev
```

默认地址为 `http://127.0.0.1:5173/analysis`。

## Module seam

页面只消费 Analysis Workspace snapshot。`FixtureAnalysisRunSource` 与后续的 `HttpSseAnalysisRunSource` 实现同一个 `AnalysisRunSource` Interface，页面不直接解析 Fixture 或 SSE。

## Verification

```powershell
pnpm test
pnpm typecheck
pnpm lint
pnpm build
```
