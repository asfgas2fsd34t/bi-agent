import { defineStore } from "pinia";
import { ref, shallowRef, type DeepReadonly, watch } from "vue";

import { createAnalysisWorkspace, type AnalysisRunSnapshot, type AnalysisWorkspace } from "@/modules/analysis/analysis-workspace";
import type { QueryPatch } from "@/modules/analysis/analysis-run-source";
import { createFixtureAnalysisRunSource, type FixtureScenarioId } from "@/modules/analysis/fixture-analysis-run-source";
import { createHttpAnalysisRunSource } from "@/modules/analysis/http-analysis-run-source";

const defaultQuestion = "看一下上个月收入最好的渠道，再和去年同期比较。";

function createSource(scenarioId: FixtureScenarioId) {
  return import.meta.env.VITE_AGENT_MODE === "remote" ? createHttpAnalysisRunSource() : createFixtureAnalysisRunSource(scenarioId);
}

export const useAnalysisWorkspaceStore = defineStore("analysis-workspace", () => {
  const selectedScenario = ref<FixtureScenarioId>("success");
  const snapshot = shallowRef<DeepReadonly<AnalysisRunSnapshot> | null>(null);
  const isLoading = ref(false);
  let workspace: AnalysisWorkspace | null = null;
  let requestVersion = 0;
  let stopSnapshotWatch: (() => void) | null = null;

  async function loadScenario(scenarioId: FixtureScenarioId, question = snapshot.value?.question || defaultQuestion) {
    const version = ++requestVersion;
    selectedScenario.value = scenarioId;
    isLoading.value = true;
    const nextWorkspace = createAnalysisWorkspace(createSource(scenarioId));
    stopSnapshotWatch?.();
    workspace = nextWorkspace;
    stopSnapshotWatch = watch(nextWorkspace.snapshot, (next) => {
      if (version === requestVersion) snapshot.value = next;
    });
    const start = nextWorkspace.start(question);
    refreshSnapshot();
    await start;
    if (version !== requestVersion) return;
    refreshSnapshot();
    isLoading.value = false;
  }

  async function runCommand(command: (active: AnalysisWorkspace) => Promise<void>) {
    if (!workspace) return;
    isLoading.value = true;
    await command(workspace);
    refreshSnapshot();
    isLoading.value = false;
  }

  function refreshSnapshot() {
    snapshot.value = workspace?.snapshot.value ?? null;
  }

  return {
    selectedScenario,
    snapshot,
    isLoading,
    loadScenario,
    applyQueryPatch: (patch: QueryPatch) => runCommand((active) => active.applyQueryPatch(patch)),
    submitClarification: (optionId: string) => runCommand((active) => active.submitClarification(optionId)),
    cancel: () => runCommand((active) => active.cancel()),
    retry: () => runCommand((active) => active.retry()),
    submitFollowup: (question: string) => runCommand((active) => active.submitFollowup(question)),
  };
});
