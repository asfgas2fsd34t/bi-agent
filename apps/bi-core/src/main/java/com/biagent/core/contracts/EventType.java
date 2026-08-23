package com.biagent.core.contracts;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

import java.util.Arrays;

/**
 * BI Agent 运行过程中产生的跨语言事件类型。
 */
public enum EventType {
    /** Agent 正在执行某个阶段。 */
    STATUS("status"),
    /** Agent 需要用户补充或选择信息。 */
    CLARIFICATION("clarification"),
    /** Agent 生成了结构化语义查询。 */
    SEMANTIC_QUERY("semantic_query"),
    /** 系统生成了待执行的 SQL。 */
    SQL("sql"),
    /** 数据查询已经返回结果。 */
    DATA("data"),
    /** 结果已经通过事实校验。 */
    VERIFIED_FACTS("verified_facts"),
    /** 生成图表所需的意图。 */
    CHART("chart"),
    /** Agent 输出了业务洞察。 */
    INSIGHT("insight"),
    /** 非阻断性告警。 */
    WARNING("warning"),
    /** 分析流程失败或被拒绝。 */
    ERROR("error");

    private final String value;

    EventType(String value) {
        this.value = value;
    }

    /** 返回跨语言契约中使用的字符串值。 */
    @JsonValue
    public String value() {
        return value;
    }

    /** 将 JSON 中的 event_type 字符串转换为 Java 枚举。 */
    @JsonCreator
    public static EventType fromValue(String value) {
        return Arrays.stream(values())
                .filter(type -> type.value.equals(value))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Unknown event_type: " + value));
    }
}
