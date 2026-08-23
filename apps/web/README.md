# Atlas BI Web 前端

基于 Vue 3 的 BI 产品外壳与 Fixture Lab。默认使用本地 fixtures；设置远程模式后，通过 Java BI Core 访问 Python Agent，不由浏览器直接访问 Python 或数据库。

在仓库根目录安装依赖后，使用以下命令启动：

```powershell
pnpm dev
```

默认地址为 `http://127.0.0.1:5173/analysis`。

## 模块边界

页面只消费 Analysis Workspace 快照。`FixtureAnalysisRunSource` 和远程 HTTP 数据源实现同一个 `AnalysisRunSource` 接口，页面不直接解析 fixtures 或服务端事件流。

## 验证命令

```powershell
pnpm test
pnpm typecheck
pnpm lint
pnpm build
```
