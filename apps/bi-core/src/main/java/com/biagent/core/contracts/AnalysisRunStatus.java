package com.biagent.core.contracts;

/**
 * 分析运行在生命周期中的状态。
 */
public enum AnalysisRunStatus {
    /** 已排队，等待执行。 */
    queued,
    /** 正在执行。 */
    running,
    /** 等待用户补充信息。 */
    awaiting_clarification,
    /** 已成功完成。 */
    completed,
    /** 执行完成但没有数据。 */
    empty,
    /** 请求被策略或权限拒绝。 */
    rejected,
    /** 执行失败。 */
    failed,
    /** 用户或系统取消了执行。 */
    cancelled,
    /** 正在恢复或重试。 */
    recovering
}
