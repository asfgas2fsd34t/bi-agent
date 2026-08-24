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
    expect(screen.getByRole("button", { name: "数据表" })).toBeTruthy();
    expect(screen.getByRole("region", { name: "SemanticQuery" })).toBeTruthy();
    expect(screen.getByRole("region", { name: "编译 SQL" })).toBeTruthy();
    expect(await screen.findByRole("region", { name: "可验证洞察" })).toBeTruthy();
  });

  it("applies query controls through the Analysis Workspace interface", async () => {
    await renderPage();
    await screen.findByRole("region", { name: "图表" });

    await chooseQueryOption("指标", "GMV");
    await chooseQueryOption("时间范围", "2026 年 1-8 月");
    await chooseQueryOption("比较方式", "环比");
    await fireEvent.click(screen.getByLabelText("地区"));
    await fireEvent.update(screen.getByLabelText("地区过滤"), "华东");
    await fireEvent.click(screen.getByRole("button", { name: "应用查询" }));
    expect(await screen.findByRole("heading", { name: "渠道、地区GMV环比" })).toBeTruthy();
    expect(await screen.findByText("year_to_date")).toBeTruthy();
    expect(await screen.findByText("region")).toBeTruthy();
    expect(await screen.findByText(/region = :region/)).toBeTruthy();
  });

  it("switches between chart and table result views", async () => {
    await renderPage();

    expect(await screen.findByRole("region", { name: "图表" })).toBeTruthy();
    expect(screen.queryByRole("region", { name: "数据" })).toBeNull();

    await fireEvent.click(screen.getByRole("button", { name: "数据表" }));
    expect(screen.getByRole("region", { name: "数据" })).toBeTruthy();
    expect(screen.queryByRole("region", { name: "图表" })).toBeNull();

    await fireEvent.click(screen.getByRole("button", { name: "图表" }));
    expect(screen.getByRole("region", { name: "图表" })).toBeTruthy();
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
    await new Promise((resolve) => setTimeout(resolve, 200));
    expect(await screen.findByText("运行已停止，没有发布不完整的分析结果。")).toBeTruthy();

    await fireEvent.click(screen.getByRole("button", { name: "载入失败场景" }));
    await fireEvent.click(await screen.findByRole("button", { name: "重新运行" }));
    expect(await screen.findByRole("heading", { name: "渠道净收入同比" })).toBeTruthy();
    await waitFor(() => expect(screen.queryByText("DATABASE_ERROR")).toBeNull());
  });

  it("renders stage status while the streaming fixture is still open", async () => {
    await renderPage();

    await fireEvent.click(screen.getByRole("button", { name: "载入流式场景" }));
    expect(await screen.findByText("正在理解分析意图")).toBeTruthy();
    expect(await screen.findByText("正在检索语义上下文")).toBeTruthy();

    await fireEvent.click(await screen.findByTitle("取消运行"));
    expect(await screen.findByText("运行已停止，没有发布不完整的分析结果。")).toBeTruthy();
  });

  it("exposes truncated and compile failure fixtures in the lab", async () => {
    await renderPage();

    await fireEvent.click(screen.getByRole("button", { name: "载入截断场景" }));
    expect(await screen.findByText("RESULT_TRUNCATED")).toBeTruthy();
    expect(screen.getByText(/结果已截断/)).toBeTruthy();

    await fireEvent.click(screen.getByRole("button", { name: "载入编译失败场景" }));
    expect(await screen.findByText("QUERY_COMPILE_FAILED")).toBeTruthy();
    expect(screen.getByText(/调整维度组合/)).toBeTruthy();
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

  it("tracks pointer resizing in tenth-percent increments", async () => {
    await renderPage();
    const splitter = screen.getByRole("separator", { name: "调整对话区宽度" });
    const layout = splitter.parentElement as HTMLElement;

    vi.spyOn(layout, "getBoundingClientRect").mockReturnValue({
      bottom: 800,
      height: 800,
      left: 100,
      right: 1107,
      toJSON: () => ({}),
      top: 0,
      width: 1007,
      x: 100,
      y: 0,
    });

    await fireEvent.pointerDown(splitter, { clientX: 454 });
    expect(splitter.getAttribute("aria-valuenow")).toBe("35.1");

    await fireEvent.pointerMove(window, { clientX: 455 });
    expect(splitter.getAttribute("aria-valuenow")).toBe("35.2");

    await fireEvent.pointerUp(window);
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

async function chooseQueryOption(label: string, option: string) {
  await fireEvent.click(screen.getByRole("button", { name: label }));
  await fireEvent.click(screen.getByRole("option", { name: option }));
  await waitFor(() => expect(screen.getByRole("button", { name: label }).textContent ?? "").toContain(option));
}
