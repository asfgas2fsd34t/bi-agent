import { defineStore } from "pinia";
import { ref, shallowRef, type DeepReadonly } from "vue";

import { createAnalysisWorkspace, type AnalysisRunSnapshot, type AnalysisWorkspace } from "@/modules/analysis/analysis-workspace";
import { createFixtureAnalysisRunSource, type FixtureScenarioId } from "@/modules/analysis/fixture-analysis-run-source";

const defaultQuestion = "看一下上个月收入最好的渠道，再和去年同期比较。";

export const useAnalysisWorkspaceStore = defineStore("analysis-workspace", () => {
  const selectedScenario = ref<FixtureScenarioId>("success");
  const snapshot = shallowRef<DeepReadonly<AnalysisRunSnapshot> | null>(null);
  const isLoading = ref(false);
  let workspace: AnalysisWorkspace | null = null;
  let requestVersion = 0;

  async function loadScenario(scenarioId: FixtureScenarioId, question = snapshot.value?.question || defaultQuestion) {
    const version = ++requestVersion;
    selectedScenario.value = scenarioId;
    isLoading.value = true;
    const nextWorkspace = createAnalysisWorkspace(createFixtureAnalysisRunSource(scenarioId));
    await nextWorkspace.start(question);
    if (version !== requestVersion) return;
    workspace = nextWorkspace;
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
    submitClarification: (optionId: string) => runCommand((active) => active.submitClarification(optionId)),
    cancel: () => runCommand((active) => active.cancel()),
    retry: () => runCommand((active) => active.retry()),
    submitFollowup: (question: string) => runCommand((active) => active.submitFollowup(question)),
  };
});
