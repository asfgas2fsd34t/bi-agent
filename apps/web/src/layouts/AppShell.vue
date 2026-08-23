<script setup lang="ts">
import { BarChart3, Boxes, Database, FileChartColumn, LayoutDashboard, Plus } from "lucide-vue-next";
import { storeToRefs } from "pinia";
import { ref } from "vue";
import { useRoute, useRouter } from "vue-router";

import { fixtureScenarios, type FixtureScenarioId } from "@/modules/analysis/fixture-analysis-run-source";
import { useAnalysisWorkspaceStore } from "@/stores/analysis-workspace";

const route = useRoute();
const router = useRouter();
const store = useAnalysisWorkspaceStore();
const { selectedScenario } = storeToRefs(store);
const activeHistoryId = ref("channel-revenue");

const historyGroups = [
  {
    label: "今天",
    items: [
      { id: "channel-revenue", title: "渠道净收入同比", meta: "刚刚 · 已完成", question: "看一下上个月收入最好的渠道，再和去年同期比较。" },
      { id: "refund-anomaly", title: "退款率异常定位", meta: "10:42 · 已完成", question: "定位退款率异常的渠道，并和上月比较。" },
    ],
  },
  {
    label: "昨天",
    items: [
      { id: "east-repeat", title: "华东复购率趋势", meta: "昨天 · 已保存", question: "看一下华东地区的复购率趋势。" },
      { id: "new-category", title: "新品类增长分析", meta: "昨天 · 已完成", question: "分析新品类的增长表现。" },
    ],
  },
];

function selectScenario(scenarioId: FixtureScenarioId) {
  void store.loadScenario(scenarioId);
}

async function openHistory(item: { id: string; question: string }) {
  activeHistoryId.value = item.id;
  if (route.name !== "analysis") await router.push({ name: "analysis" });
  void store.loadScenario("success", item.question);
}
</script>

<template>
  <div class="product-frame">
    <aside class="sidebar" aria-label="产品导航">
      <div class="brand-lockup">
        <span class="brand-mark"><BarChart3 :size="18" /></span>
        <span><strong>Atlas BI</strong><small>Governed analytics</small></span>
      </div>

      <button class="primary-command" type="button" @click="selectScenario('loading')">
        <Plus :size="17" />
        新建分析
      </button>

      <nav class="product-nav" aria-label="工作区">
        <div class="analysis-nav-group">
          <RouterLink class="nav-item" :class="{ active: route.name === 'analysis' }" to="/analysis"><LayoutDashboard :size="17" />经营分析</RouterLink>

          <section class="history-section" aria-labelledby="history-heading">
            <div class="history-section-heading">
              <span class="eyebrow" id="history-heading">最近会话</span>
            </div>
            <div v-for="group in historyGroups" :key="group.label" class="history-group">
              <span class="history-group-label">{{ group.label }}</span>
              <button
                v-for="item in group.items"
                :key="item.id"
                type="button"
                class="history-item"
                :class="{ active: activeHistoryId === item.id }"
                :aria-pressed="activeHistoryId === item.id"
                @click="openHistory(item)"
              >
                <strong>{{ item.title }}</strong>
                <small>{{ item.meta }}</small>
              </button>
            </div>
          </section>
        </div>
        <RouterLink class="nav-item" :class="{ active: route.name === 'semantic-studio' }" to="/semantic-studio"><Boxes :size="17" />语义建模</RouterLink>
        <a class="nav-item" href="#saved"><FileChartColumn :size="17" />已保存分析</a>
        <a class="nav-item" href="#sources"><Database :size="17" />数据源</a>
      </nav>

      <section class="fixture-lab" aria-labelledby="fixture-heading">
        <div class="fixture-heading-row">
          <div>
            <span class="eyebrow">Fixture Lab</span>
            <h2 id="fixture-heading">运行状态</h2>
          </div>
          <span class="fixture-count">9</span>
        </div>
        <div class="scenario-grid">
          <button
            v-for="scenario in fixtureScenarios"
            :key="scenario.id"
            type="button"
            class="scenario-button"
            :class="{ selected: selectedScenario === scenario.id }"
            :aria-label="`载入${scenario.label}场景`"
            :aria-pressed="selectedScenario === scenario.id"
            :title="scenario.description"
            @click="selectScenario(scenario.id)"
          >
            {{ scenario.label }}
          </button>
        </div>
        <p class="scenario-description">
          {{ fixtureScenarios.find((scenario) => scenario.id === selectedScenario)?.description }}
        </p>
      </section>

      <div class="user-block">
        <span class="avatar">陈</span>
        <span><strong>陈默</strong><small>Modeler · Demo Workspace</small></span>
      </div>
    </aside>

    <RouterView />
  </div>
</template>
