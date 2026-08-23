import { createRouter, createWebHistory } from "vue-router";

import AppShell from "@/layouts/AppShell.vue";

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: "/",
      component: AppShell,
      children: [
        { path: "", redirect: "analysis" },
        { path: "analysis", name: "analysis", component: () => import("@/pages/AnalysisWorkspacePage.vue") },
        { path: "semantic-studio", name: "semantic-studio", component: () => import("@/pages/SemanticStudioPage.vue") },
      ],
    },
  ],
});
