<script setup lang="ts">
import {
  Activity,
  AlertTriangle,
  ArrowUp,
  BarChart3,
  CheckCircle2,
  CircleSlash2,
  Clock3,
  Code2,
  Database,
  LoaderCircle,
  MessageSquareText,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Square,
  Table2,
  TriangleAlert,
} from "lucide-vue-next";
import { storeToRefs } from "pinia";
import { computed, defineAsyncComponent, onBeforeUnmount, onMounted, reactive, ref, watch } from "vue";

import QuerySelect from "@/components/QuerySelect.vue";
import type { QueryPatch } from "@/modules/analysis/analysis-run-source";
import { fixtureComparisonLabels, fixtureDimensionLabels, fixtureMetricLabels, fixtureTimeRangeLabels } from "@/modules/analysis/query-options";
import { useAnalysisWorkspaceStore } from "@/stores/analysis-workspace";
import type { ChartIntent, ResultRow, VerifiedFact } from "@contracts/typescript/analysis-run";

const store = useAnalysisWorkspaceStore();
const AnalysisChart = defineAsyncComponent(() => import("@/components/AnalysisChart.vue"));
const { snapshot, isLoading } = storeToRefs(store);
const draft = ref("再按地区拆分");
const workspaceLayout = ref<HTMLElement | null>(null);
const chatWidth = ref(35);
const resultView = ref<"chart" | "table">("chart");
const queryDraft = reactive({
  metric: "net_revenue",
  timeRange: "previous_month",
  comparison: "year_over_year",
  dimensions: ["channel"] as string[],
  regionFilter: "",
});
let removeResizeListeners: (() => void) | null = null;

const metricOptions = Object.entries(fixtureMetricLabels).map(([value, label]) => ({ value, label }));
const timeRangeOptions = Object.entries(fixtureTimeRangeLabels).map(([value, label]) => ({ value, label }));
const comparisonOptions = Object.entries(fixtureComparisonLabels).map(([value, label]) => ({ value, label }));
const dimensionOptions = Object.entries(fixtureDimensionLabels).map(([value, label]) => ({ value, label }));

const isBusy = computed(() => ["queued", "running", "recovering"].includes(snapshot.value?.status ?? ""));
const statusTone = computed(() => {
  switch (snapshot.value?.status) {
    case "completed":
      return "success";
    case "rejected":
    case "failed":
      return "danger";
    case "cancelled":
    case "empty":
      return "warning";
    default:
      return "info";
  }
});

// 共享契约只提供通用事实集合，页面在展示层按稳定 key 选择当前卡片。
const factByKey = (key: string): VerifiedFact | undefined => snapshot.value?.verifiedFacts?.facts.find((fact) => fact.key === key);
const metricFact = computed(() => factByKey(snapshot.value?.semanticQuery?.metric ?? snapshot.value?.queryPatch.metric ?? "net_revenue"));
const leaderFact = computed(() => factByKey("top_channel"));
const freshnessFact = computed(() => factByKey("data_freshness"));
const metricLabel = computed(() => metricFact.value?.label ?? fixtureMetricLabels[snapshot.value?.queryPatch.metric as keyof typeof fixtureMetricLabels] ?? "净收入");
const queryDimensions = computed(() => snapshot.value?.semanticQuery?.dimensions ?? snapshot.value?.queryPatch.dimensions ?? ["channel"]);
const dimensionLabel = computed(() => queryDimensions.value.map((dimension) => fixtureDimensionLabels[dimension as keyof typeof fixtureDimensionLabels] ?? dimension).join("、") || "渠道");
const comparisonLabel = computed(() => {
  const comparison = snapshot.value?.semanticQuery?.comparison ?? snapshot.value?.queryPatch.comparison ?? "year_over_year";
  return fixtureComparisonLabels[comparison as keyof typeof fixtureComparisonLabels] ?? comparison;
});
const timeRangeLabel = computed(() => {
  const timeRange = snapshot.value?.semanticQuery?.timeRange ?? snapshot.value?.queryPatch.timeRange ?? "previous_month";
  return fixtureTimeRangeLabels[timeRange as keyof typeof fixtureTimeRangeLabels] ?? timeRange;
});
const analysisTitle = computed(() => `${dimensionLabel.value}${metricLabel.value}${comparisonLabel.value}`);
const analysisSummary = computed(() => `${timeRangeLabel.value} · 按${queryDimensions.value.map((dimension) => fixtureDimensionLabels[dimension as keyof typeof fixtureDimensionLabels] ?? dimension).join("、")} · ${comparisonLabel.value}`);

onMounted(() => {
  if (!snapshot.value) void store.loadScenario("success");
});

watch(snapshot, (next) => {
  if (!next) return;
  const query = next.semanticQuery ?? next.queryPatch;
  if (query.metric) queryDraft.metric = query.metric;
  if (query.timeRange) queryDraft.timeRange = query.timeRange;
  if (query.comparison) queryDraft.comparison = query.comparison;
  if (query.dimensions?.length) queryDraft.dimensions = [...query.dimensions];
  queryDraft.regionFilter = next.queryPatch.filters?.find((filter) => filter.field === "region")?.value ?? "";
}, { immediate: true });

onBeforeUnmount(stopResize);

function submitFollowup() {
  const question = draft.value.trim();
  if (!question) return;
  draft.value = "";
  void store.submitFollowup(question);
}

function applyQuery() {
  const dimensions = queryDraft.dimensions.length ? [...queryDraft.dimensions] : ["channel"];
  const filters: QueryPatch["filters"] = queryDraft.regionFilter.trim()
    ? [{ field: "region", operator: "equals", value: queryDraft.regionFilter.trim() }]
    : [];
  void store.applyQueryPatch({
    metric: queryDraft.metric,
    timeRange: queryDraft.timeRange,
    comparison: queryDraft.comparison,
    dimensions,
    filters,
  });
}

function clampChatWidth(value: number, precision = 0): number {
  const factor = 10 ** precision;
  return Math.min(55, Math.max(25, Math.round(value * factor) / factor));
}

function adjustChatWidth(delta: number) {
  chatWidth.value = clampChatWidth(chatWidth.value + delta);
}

function updateChatWidthFromPointer(event: PointerEvent) {
  const element = workspaceLayout.value;
  if (!element) return;

  const bounds = element.getBoundingClientRect();
  const splitterWidth = 7;
  const availableWidth = Math.max(1, bounds.width - splitterWidth);
  const nextWidth = ((event.clientX - bounds.left - splitterWidth / 2) / availableWidth) * 100;
  chatWidth.value = clampChatWidth(nextWidth, 1);
}

function stopResize() {
  removeResizeListeners?.();
  removeResizeListeners = null;
}

function startResize(event: PointerEvent) {
  event.preventDefault();
  updateChatWidthFromPointer(event);
  stopResize();

  const handlePointerMove = (moveEvent: PointerEvent) => updateChatWidthFromPointer(moveEvent);
  const handlePointerUp = () => stopResize();
  window.addEventListener("pointermove", handlePointerMove);
  window.addEventListener("pointerup", handlePointerUp, { once: true });
  removeResizeListeners = () => {
    window.removeEventListener("pointermove", handlePointerMove);
    window.removeEventListener("pointerup", handlePointerUp);
  };
}

function handleSplitterKeydown(event: KeyboardEvent) {
  if (event.key === "ArrowLeft") {
    event.preventDefault();
    adjustChatWidth(-2);
  } else if (event.key === "ArrowRight") {
    event.preventDefault();
    adjustChatWidth(2);
  } else if (event.key === "Home") {
    event.preventDefault();
    chatWidth.value = 25;
  } else if (event.key === "End") {
    event.preventDefault();
    chatWidth.value = 55;
  }
}

function cellText(row: ResultRow, field: string): string {
  return String(row[field] ?? "");
}

function cellNumber(row: ResultRow, field: string): number | null {
  const value = row[field];
  return typeof value === "number" ? value : null;
}

function formatNumber(row: ResultRow, field: string): string {
  const value = cellNumber(row, field);
  return value === null ? "—" : `¥${value.toFixed(2)}M`;
}

function formatChange(row: ResultRow): string {
  const value = cellNumber(row, "change");
  if (value === null) return "—";
  return `${value >= 0 ? "+" : ""}${value}%`;
}

function columnLabel(column: string): string {
  return {
    channel: "渠道",
    region: "地区",
    category: "品类",
    current: "当前值",
    previous: "对比值",
    change: "变化",
  }[column] ?? column;
}

function formatCell(row: ResultRow, column: string): string {
  if (column === "current" || column === "previous") return formatNumber(row, column);
  if (column === "change") return formatChange(row);
  return cellText(row, column);
}

function changeTone(row: ResultRow): "positive" | "negative" | undefined {
  const value = cellNumber(row, "change");
  return value === null ? undefined : value >= 0 ? "positive" : "negative";
}

function factValueText(fact: VerifiedFact | undefined): string {
  return fact?.value === null || fact?.value === undefined ? "—" : String(fact.value);
}

function factAttributeText(fact: VerifiedFact | undefined, key: string): string {
  const value = fact?.attributes?.[key];
  return value === null || value === undefined ? "" : String(value);
}

function chartKindLabel(kind: ChartIntent["kind"]): string {
  return { bar: "柱状图", line: "折线图", area: "面积图", pie: "饼图", table: "表格" }[kind];
}
</script>

<template>
  <section class="application-shell">
      <header class="topbar">
        <div class="topbar-title">
          <strong>经营分析</strong>
          <span class="source-label"><Database :size="14" />Demo Warehouse</span>
        </div>
        <div class="topbar-meta">
          <span class="semantic-badge"><ShieldCheck :size="15" />{{ snapshot?.semanticVersion ?? "语义版本待确认" }}</span>
          <span class="run-badge" :class="statusTone">
            <LoaderCircle v-if="isBusy" :size="15" class="spin" />
            <CheckCircle2 v-else-if="snapshot?.status === 'completed'" :size="15" />
            <TriangleAlert v-else-if="snapshot?.status === 'failed' || snapshot?.status === 'rejected'" :size="15" />
            <Clock3 v-else :size="15" />
            {{ snapshot?.statusLabel ?? "准备分析" }}
          </span>
        </div>
      </header>

      <div ref="workspaceLayout" class="workspace-layout" :style="{ '--chat-width': `${chatWidth}%` }">
        <section class="chat-panel" aria-label="分析对话">
          <div class="panel-heading">
            <div><span class="eyebrow">Conversation</span><h2>分析对话</h2></div>
            <MessageSquareText :size="17" />
          </div>

          <div class="conversation">
            <article class="turn user-turn">
              <div class="turn-author"><span class="avatar small">陈</span><strong>你</strong></div>
              <p>{{ snapshot?.question || "看一下上个月收入最好的渠道，再和去年同期比较。" }}</p>
            </article>

            <article class="turn agent-turn">
              <div class="turn-author"><span class="agent-mark"><Sparkles :size="14" /></span><strong>Atlas</strong></div>
              <div v-if="!snapshot || isLoading" class="agent-progress">
                <LoaderCircle :size="17" class="spin" />正在装载 Fixture…
              </div>
              <template v-else-if="snapshot.clarification">
                <p>{{ snapshot.clarification.question }}</p>
                <div class="clarification-options">
                  <button
                    v-for="option in snapshot.clarification.options"
                    :key="option.id"
                    type="button"
                    @click="store.submitClarification(option.id)"
                  >
                    <strong>{{ option.label }}</strong><span>{{ option.description }}</span>
                  </button>
                </div>
              </template>
              <template v-else-if="snapshot.status === 'completed'">
                <p>已按{{ metricLabel }}口径完成分析。{{ snapshot.insights[0]?.claim || "结果已通过语义版本与数据证据校验。" }}</p>
              </template>
              <template v-else-if="snapshot.errors.length">
                <p>{{ snapshot.errors[0]?.title }}。请查看右侧错误详情。</p>
              </template>
              <template v-else-if="snapshot.status === 'empty'">
                <p>查询已经完成，但当前时间范围和权限条件下没有数据。</p>
              </template>
              <template v-else-if="snapshot.status === 'cancelled'">
                <p>运行已停止，没有发布不完整的分析结果。</p>
              </template>
              <div v-else class="progress-stack">
                <div class="progress-row done"><CheckCircle2 :size="15" />解析分析意图</div>
                <div class="progress-row" :class="{ done: snapshot.semanticQuery }"><Activity :size="15" />检索语义上下文</div>
                <div class="progress-row" :class="{ done: snapshot.sql }"><Code2 :size="15" />校验并编译查询</div>
                <div class="progress-row" :class="{ done: snapshot.data }"><Database :size="15" />执行并验证结果</div>
              </div>
            </article>
          </div>

          <form class="composer" @submit.prevent="submitFollowup">
            <label class="sr-only" for="analysis-followup">继续追问</label>
            <input id="analysis-followup" v-model="draft" placeholder="继续追问当前分析" />
            <button v-if="isBusy" type="button" class="icon-command danger-command" title="取消运行" @click="store.cancel()">
              <Square :size="15" fill="currentColor" />
            </button>
            <button v-else type="submit" class="icon-command" title="发送追问"><ArrowUp :size="17" /></button>
          </form>
        </section>

        <div
          class="workspace-splitter"
          role="separator"
          aria-label="调整对话区宽度"
          aria-orientation="vertical"
          aria-valuemin="25"
          aria-valuemax="55"
          :aria-valuenow="chatWidth"
          :aria-valuetext="`${chatWidth}%`"
          tabindex="0"
          title="调整对话区宽度"
          @pointerdown="startResize"
          @keydown="handleSplitterKeydown"
        >
          <span aria-hidden="true"></span>
        </div>

        <main class="workbench">
          <div class="workbench-title-row">
            <div>
              <span class="eyebrow">AnalysisRun · {{ snapshot?.runId ?? "pending" }}</span>
              <h1>{{ analysisTitle }}</h1>
              <p>{{ analysisSummary }}</p>
            </div>
            <button v-if="snapshot?.status === 'failed'" class="secondary-command" type="button" @click="store.retry()">
              <RotateCcw :size="16" />重新运行
            </button>
              <button v-else-if="snapshot?.status === 'cancelled'" class="secondary-command" type="button" @click="store.loadScenario('recovered')">
              <RefreshCw :size="16" />查看恢复场景
            </button>
          </div>

          <form class="query-controls" aria-label="查询控件" @submit.prevent="applyQuery">
            <div class="query-control-heading">
              <div><span class="eyebrow">SemanticQuery</span><strong>调整查询</strong></div>
              <span>仅使用已发布语义成员</span>
            </div>
            <div class="query-control-grid">
              <div class="query-control-field">
                <span>指标</span>
                <QuerySelect v-model="queryDraft.metric" label="指标" :options="metricOptions" />
              </div>
              <div class="query-control-field">
                <span>时间范围</span>
                <QuerySelect v-model="queryDraft.timeRange" label="时间范围" :options="timeRangeOptions" />
              </div>
              <div class="query-control-field">
                <span>比较方式</span>
                <QuerySelect v-model="queryDraft.comparison" label="比较方式" :options="comparisonOptions" />
              </div>
              <label>
                <span>地区过滤</span>
                <input v-model="queryDraft.regionFilter" aria-label="地区过滤" placeholder="全部地区" />
              </label>
            </div>
            <fieldset class="dimension-picker">
              <legend>维度</legend>
              <label v-for="option in dimensionOptions" :key="option.value" class="dimension-option">
                <input v-model="queryDraft.dimensions" type="checkbox" :value="option.value" :aria-label="option.label" />
                <span>{{ option.label }}</span>
              </label>
            </fieldset>
            <button class="primary-command query-apply" type="submit"><Activity :size="15" />应用查询</button>
          </form>

          <div v-if="snapshot" class="status-banner" :class="statusTone">
            <span class="status-icon">
              <LoaderCircle v-if="isBusy" :size="18" class="spin" />
              <CheckCircle2 v-else-if="snapshot.status === 'completed'" :size="18" />
              <CircleSlash2 v-else-if="snapshot.status === 'cancelled'" :size="18" />
              <AlertTriangle v-else :size="18" />
            </span>
            <span><strong>{{ snapshot.statusLabel }}</strong><small>{{ snapshot.statusDetail || `已接收 ${snapshot.lastSequence} 个 typed events` }}</small></span>
          </div>

          <section v-if="snapshot?.errors.length" class="error-state" aria-label="错误">
            <span class="error-mark"><TriangleAlert :size="22" /></span>
            <div><code>{{ snapshot.errors[0]?.code }}</code><h2>{{ snapshot.errors[0]?.title }}</h2><p>{{ snapshot.errors[0]?.detail }}</p><strong>{{ snapshot.errors[0]?.action }}</strong></div>
          </section>

          <section v-if="snapshot?.status === 'empty'" class="empty-state">
            <span><Table2 :size="24" /></span><h2>没有符合条件的数据</h2><p>调整时间范围或筛选条件后重新运行。</p>
          </section>

          <template v-if="snapshot?.data?.rows.length">
            <section v-if="snapshot.verifiedFacts" class="metric-strip" aria-label="关键指标">
              <div><span class="eyebrow">{{ metricFact?.label ?? "核心指标" }}</span><strong>{{ metricFact?.formattedValue ?? factValueText(metricFact) }}</strong><small v-if="metricFact?.change !== undefined" class="positive">{{ metricFact.change >= 0 ? "+" : "" }}{{ metricFact.change }}% {{ comparisonLabel }}</small></div>
              <div><span class="eyebrow">{{ leaderFact?.label ?? "领先项" }}</span><strong>{{ factValueText(leaderFact) }}</strong><small>{{ leaderFact?.formattedValue ?? "—" }}<template v-if="factAttributeText(leaderFact, 'share')"> · {{ factAttributeText(leaderFact, "share") }}%</template></small></div>
              <div><span class="eyebrow">{{ freshnessFact?.label ?? "数据时间" }}</span><strong>{{ freshnessFact?.formattedValue ?? factValueText(freshnessFact) }}</strong><small>{{ factAttributeText(freshnessFact, "date") || snapshot.verifiedFacts.asOf }}</small></div>
            </section>

            <div class="result-view-switch" aria-label="结果视图">
              <button type="button" :aria-pressed="resultView === 'chart'" :class="{ active: resultView === 'chart' }" @click="resultView = 'chart'"><BarChart3 :size="15" />图表</button>
              <button type="button" :aria-pressed="resultView === 'table'" :class="{ active: resultView === 'table' }" @click="resultView = 'table'"><Table2 :size="15" />数据表</button>
            </div>

            <section v-if="snapshot.chart && resultView === 'chart'" class="artifact chart-artifact" aria-label="图表">
              <div class="artifact-heading"><div><span class="artifact-icon"><BarChart3 :size="16" /></span><h2>图表</h2></div><span>{{ chartKindLabel(snapshot.chart.kind) }} · 按{{ dimensionLabel }}比较</span></div>
              <AnalysisChart
                v-if="snapshot.chart.kind !== 'table'"
                :rows="snapshot.data.rows"
                :kind="snapshot.chart.kind"
                :category-field="snapshot.chart.categoryField"
                :category-fields="queryDimensions"
                :series="snapshot.chart.series"
              />
            </section>

            <section v-if="resultView === 'table'" class="artifact" aria-label="数据">
              <div class="artifact-heading"><div><span class="artifact-icon blue"><Table2 :size="16" /></span><h2>数据</h2></div><span>{{ snapshot.data.rows.length }} 行 · {{ snapshot.data.truncated ? "结果已截断" : "未截断" }}</span></div>
              <div class="data-table-wrap">
                <table>
                  <thead><tr><th v-for="column in snapshot.data.columns" :key="column">{{ columnLabel(column) }}</th></tr></thead>
                  <tbody>
                    <tr v-for="(row, index) in snapshot.data.rows" :key="`${cellText(row, queryDimensions[0] ?? 'channel')}-${index}`">
                      <td v-for="column in snapshot.data.columns" :key="column" :class="column === 'change' ? changeTone(row) : undefined">{{ formatCell(row, column) }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>
          </template>

          <div v-if="snapshot?.semanticQuery || snapshot?.sql" class="details-grid">
            <section v-if="snapshot.semanticQuery" class="artifact compact-artifact" aria-label="SemanticQuery">
              <div class="artifact-heading"><div><span class="artifact-icon amber"><Activity :size="16" /></span><h2>SemanticQuery</h2></div><span>Schema valid</span></div>
              <dl class="query-grid">
                <div><dt>metric</dt><dd>{{ snapshot.semanticQuery.metric }}</dd></div>
                <div><dt>dimensions</dt><dd class="query-dimensions"><span v-for="dimension in snapshot.semanticQuery.dimensions" :key="dimension">{{ dimension }}</span></dd></div>
                <div><dt>timeRange</dt><dd>{{ snapshot.semanticQuery.timeRange }}</dd></div>
                <div><dt>comparison</dt><dd>{{ snapshot.semanticQuery.comparison }}</dd></div>
                <div><dt>指标口径</dt><dd>{{ metricLabel }}</dd></div>
                <div><dt>语义版本</dt><dd>{{ snapshot.semanticVersion ?? "待确认" }} · Published</dd></div>
                <div v-if="snapshot.queryPatch.filters?.length"><dt>filters</dt><dd>{{ snapshot.queryPatch.filters.map((filter) => `${filter.field} = ${filter.value}`).join(", ") }}</dd></div>
              </dl>
            </section>

            <section v-if="snapshot.sql" class="artifact compact-artifact" aria-label="编译 SQL">
              <div class="artifact-heading"><div><span class="artifact-icon dark"><Code2 :size="16" /></span><h2>编译 SQL</h2></div><span>{{ snapshot.sql.dialect }}</span></div>
              <pre class="sql-block">{{ snapshot.sql.statement }}</pre>
            </section>
          </div>

          <section v-if="snapshot?.insights.length" class="artifact" aria-label="可验证洞察">
            <div class="artifact-heading"><div><span class="artifact-icon"><ShieldCheck :size="16" /></span><h2>可验证洞察</h2></div><span>{{ snapshot.insights.length }}/{{ snapshot.insights.length }} 有数据证据</span></div>
            <ol class="insight-list">
              <li v-for="insight in snapshot.insights" :key="insight.evidence"><span>{{ insight.claim }}</span><code>{{ insight.evidence }}</code></li>
            </ol>
          </section>

          <section v-if="snapshot?.warnings.length" class="warning-list" aria-label="警告">
            <article v-for="warning in snapshot.warnings" :key="warning.code"><AlertTriangle :size="17" /><div><strong>{{ warning.title }}</strong><p>{{ warning.detail }}</p><code>{{ warning.code }}</code></div></article>
          </section>

          <section v-if="isBusy && !snapshot?.data" class="skeleton-stack" aria-label="加载中">
            <div class="skeleton metric-skeleton"></div><div class="skeleton chart-skeleton"></div><div class="skeleton row-skeleton"></div>
          </section>
        </main>
      </div>
  </section>
</template>
