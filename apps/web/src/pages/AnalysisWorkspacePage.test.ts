import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/vue";
import { createPinia } from "pinia";
import { afterEach, describe, expect, it, vi } from "vitest";

import App from "@/App.vue";
import { router } from "@/router";

vi.mock("vue-echarts", () => ({
  default: { name: "VChart", template: '<div data-testid="echarts-canvas"></div>' },
}));

afterEach(cleanup);

describe("Analysis Workspace page", () => {
  it("renders successful analysis artifacts as separate regions", async () => {
    await renderPage();

    expect(await screen.findByRole("region", { name: "图表" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "渠道净收入同比" })).toBeTruthy();
    expect(screen.getByRole("region", { name: "数据" })).toBeTruthy();
    expect(screen.getByRole("region", { name: "SemanticQuery" })).toBeTruthy();
    expect(screen.getByRole("region", { name: "编译 SQL" })).toBeTruthy();
    expect(screen.getByRole("region", { name: "可验证洞察" })).toBeTruthy();
  });

  it("switches between clarification and denied fixtures through named controls", async () => {
    await renderPage();

    await fireEvent.click(screen.getByRole("button", { name: "载入澄清场景" }));
    expect(await screen.findByText(/本次希望使用哪个口径/)).toBeTruthy();
    expect(within(screen.getByRole("region", { name: "分析对话" })).getByRole("button", { name: /^净收入/ })).toBeTruthy();
    await fireEvent.click(screen.getByRole("button", { name: /GMV/ }));
    expect(await screen.findByText("gmv")).toBeTruthy();

    await fireEvent.click(screen.getByRole("button", { name: "载入拒绝场景" }));
    expect(await screen.findByText("POLICY_DENIED")).toBeTruthy();
    expect(screen.getByText("联系工作区管理员申请 finance_analyst 角色。")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "重新运行" })).toBeNull();
  });

  it("runs cancellation and retry through workspace commands", async () => {
    await renderPage();

    await fireEvent.click(screen.getByRole("button", { name: "载入流式场景" }));
    await waitFor(() => expect(screen.getByTitle("取消运行")).toBeTruthy());
    await fireEvent.click(screen.getByTitle("取消运行"));
    expect(await screen.findByText("运行已停止，没有发布不完整的分析结果。")).toBeTruthy();

    await fireEvent.click(screen.getByRole("button", { name: "载入失败场景" }));
    await fireEvent.click(await screen.findByRole("button", { name: "重新运行" }));
    expect(await screen.findByRole("heading", { name: "渠道净收入同比" })).toBeTruthy();
    await waitFor(() => expect(screen.queryByText("DATABASE_ERROR")).toBeNull());
  });

  it("keeps the product sidebar while the right page switches to Semantic Studio", async () => {
    await renderPage();
    const sidebar = screen.getByRole("complementary", { name: "产品导航" });
    const history = within(screen.getByRole("region", { name: "最近会话" }));

    await fireEvent.click(history.getByRole("button", { name: /^渠道净收入同比/ }));
    expect(history.getByRole("button", { name: /^渠道净收入同比/ }).getAttribute("aria-pressed")).toBe("true");

    await fireEvent.click(screen.getByRole("link", { name: "语义建模" }));

    expect(await screen.findByRole("heading", { name: "ecommerce" })).toBeTruthy();
    expect(screen.getByRole("complementary", { name: "产品导航" })).toBe(sidebar);
    expect(history.getByRole("button", { name: /^渠道净收入同比/ }).getAttribute("aria-pressed")).toBe("false");
    expect(screen.getByRole("button", { name: "载入成功场景" })).toBeTruthy();

    await fireEvent.click(history.getByRole("button", { name: /^退款率异常定位/ }));
    expect(await screen.findByRole("heading", { name: "渠道净收入同比" })).toBeTruthy();
    expect(router.currentRoute.value.name).toBe("analysis");
    expect(await screen.findByText("定位退款率异常的渠道，并和上月比较。")).toBeTruthy();
  });

  it("shows recent analysis sessions and opens a selected session", async () => {
    await renderPage();

    const history = screen.getByRole("region", { name: "最近会话" });
    const historyQueries = within(history);
    expect(history).toBeTruthy();
    await fireEvent.click(historyQueries.getByRole("button", { name: /^退款率异常定位/ }));

    expect(await screen.findByText("定位退款率异常的渠道，并和上月比较。")).toBeTruthy();
    expect(historyQueries.getByRole("button", { name: /^退款率异常定位/ }).getAttribute("aria-pressed")).toBe("true");
  });

  it("allows keyboard resizing between conversation and results", async () => {
    await renderPage();
    const splitter = screen.getByRole("separator", { name: "调整对话区宽度" });

    expect(splitter.getAttribute("aria-valuenow")).toBe("35");

    await fireEvent.keyDown(splitter, { key: "ArrowRight" });
    expect(splitter.getAttribute("aria-valuenow")).toBe("37");

    await fireEvent.keyDown(splitter, { key: "End" });
    expect(splitter.getAttribute("aria-valuenow")).toBe("55");
  });
});

async function renderPage() {
  await router.push("/analysis");
  return render(App, {
    global: {
      plugins: [createPinia(), router],
    },
  });
}
