<script setup lang="ts">
import { ArrowLeft, Boxes, CheckCircle2, FileCode2, GitBranch, Play, ShieldCheck } from "lucide-vue-next";
</script>

<template>
  <main class="studio-page">
    <header class="studio-header">
      <div><span class="eyebrow">Semantic Studio</span><h1>ecommerce</h1><p>已发布版本 v3 · Draft v4 尚有 2 项变更</p></div>
      <RouterLink class="secondary-command" to="/analysis"><ArrowLeft :size="16" />返回分析</RouterLink>
    </header>
    <div class="studio-layout">
      <nav class="studio-nav" aria-label="语义建模导航">
        <button class="studio-nav-item active"><Boxes :size="17" />语义成员 <span>28</span></button>
        <button class="studio-nav-item"><GitBranch :size="17" />关系 <span>6</span></button>
        <button class="studio-nav-item"><ShieldCheck :size="17" />策略 <span>4</span></button>
        <button class="studio-nav-item"><FileCode2 :size="17" />Approved Example <span>12</span></button>
      </nav>
      <section class="studio-content">
        <div class="studio-toolbar"><div><h2>指标</h2><p>8 个已发布，1 个 Draft</p></div><button class="primary-command"><Play :size="16" />校验 Draft</button></div>
        <div class="semantic-table">
          <div class="semantic-row header"><span>名称</span><span>标识</span><span>聚合</span><span>状态</span></div>
          <div class="semantic-row"><strong>净收入</strong><code>net_revenue</code><span>SUM</span><span class="published"><CheckCircle2 :size="14" />Published</span></div>
          <div class="semantic-row"><strong>订单数</strong><code>order_count</code><span>COUNT DISTINCT</span><span class="published"><CheckCircle2 :size="14" />Published</span></div>
          <div class="semantic-row"><strong>退款率</strong><code>refund_rate</code><span>RATIO</span><span class="published"><CheckCircle2 :size="14" />Published</span></div>
          <div class="semantic-row draft"><strong>贡献毛利</strong><code>contribution_margin</code><span>RATIO</span><span>Draft</span></div>
        </div>
      </section>
    </div>
  </main>
</template>
