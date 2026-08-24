package com.biagent.core.demo.query;

import com.biagent.core.contracts.AgentEvent;
import com.biagent.core.contracts.ChartIntent;
import com.biagent.core.contracts.EventType;
import com.biagent.core.contracts.InsightPayload;
import com.biagent.core.contracts.QueryFilter;
import com.biagent.core.contracts.QueryPatch;
import com.biagent.core.contracts.QueryResult;
import com.biagent.core.contracts.SemanticQuery;
import com.biagent.core.contracts.StructuredError;
import com.biagent.core.contracts.VerifiedFacts;
import com.biagent.core.store.AgentEventStore;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;

/**
 * 执行已编译查询，并将结果转换为 typed AgentEvent。
 *
 * <p>使用场景：统一处理首次分析和用户调整查询后的重新执行。</p>
 */
@Service
public final class QueryExecutionService {
    private static final OffsetDateTime DATA_AS_OF = OffsetDateTime.parse("2026-08-01T08:30:00+08:00");
    private final NamedParameterJdbcTemplate jdbcTemplate;
    private final QueryCompiler compiler;
    private final EcommerceSemanticPackage semanticPackage;
    private final AgentEventStore eventStore;
    private final ObjectMapper objectMapper;
    private final ConcurrentMap<String, QueryState> queryStates = new ConcurrentHashMap<>();

    public QueryExecutionService(
            NamedParameterJdbcTemplate jdbcTemplate,
            QueryCompiler compiler,
            EcommerceSemanticPackage semanticPackage,
            AgentEventStore eventStore,
            ObjectMapper objectMapper
    ) {
        this.jdbcTemplate = jdbcTemplate;
        this.compiler = compiler;
        this.semanticPackage = semanticPackage;
        this.eventStore = eventStore;
        this.objectMapper = objectMapper;
    }

    /** 在首次分析或查询调整场景下执行校验、编译和 PostgreSQL 查询。 */
    public List<AgentEvent> execute(String runId, SemanticQuery query, List<QueryFilter> filters, int afterSequence) {
        var generated = new ArrayList<AgentEvent>();
        int nextSequence = Math.max(afterSequence, eventStore.lastSequence(runId));
        append(generated, runId, ++nextSequence, EventType.STATUS, Map.of(
                "status", "running",
                "label", "正在执行查询",
                "detail", "Java 已加载 " + semanticPackage.VERSION + " 并校验 SemanticQuery"
        ));

        try {
            var normalizedFilters = filters == null ? List.<QueryFilter>of() : List.copyOf(filters);
            CompiledQuery compiled = compiler.compile(query, normalizedFilters);
            queryStates.put(runId, new QueryState(query, normalizedFilters));
            append(generated, runId, ++nextSequence, EventType.SEMANTIC_QUERY, query);
            append(generated, runId, ++nextSequence, EventType.SQL, Map.of(
                    "dialect", "postgresql",
                    "statement", compiled.statement()
            ));

            QueryResult result = queryResult(compiled);
            append(generated, runId, ++nextSequence, EventType.DATA, result);
            if (result.rows().isEmpty()) {
                append(generated, runId, ++nextSequence, EventType.WARNING, Map.of(
                        "code", "NO_DATA_IN_RANGE",
                        "title", "当前范围没有数据",
                        "detail", "当前时间范围和筛选条件下没有符合权限的记录。"
                ));
                append(generated, runId, ++nextSequence, EventType.STATUS, Map.of(
                        "status", "empty",
                        "label", "查询完成，无结果"
                ));
                return generated;
            }

            append(generated, runId, ++nextSequence, EventType.VERIFIED_FACTS, verifiedFacts(query, result));
            append(generated, runId, ++nextSequence, EventType.CHART, chartIntent(query));
            append(generated, runId, ++nextSequence, EventType.INSIGHT, insight(query, result));
            append(generated, runId, ++nextSequence, EventType.STATUS, Map.of(
                    "status", "completed",
                    "label", "分析完成",
                    "detail", "Java 已执行 PostgreSQL 查询并生成可核查结果"
            ));
        } catch (QueryCompilationException error) {
            appendError(generated, runId, ++nextSequence, error.error());
            append(generated, runId, ++nextSequence, EventType.STATUS, Map.of(
                    "status", "failed",
                    "label", "语义查询编译失败"
            ));
        } catch (DataAccessException error) {
            appendError(generated, runId, ++nextSequence, new StructuredError(
                    "DATABASE_ERROR",
                    "数据源暂时不可用",
                    "PostgreSQL 没有返回可用结果。",
                    "稍后重试，或缩短分析时间范围。",
                    true
            ));
            append(generated, runId, ++nextSequence, EventType.STATUS, Map.of(
                    "status", "failed",
                    "label", "分析失败"
            ));
        }
        return generated;
    }

    /** 在用户调整当前查询的场景下合并修改，并重新执行查询。 */
    public List<AgentEvent> applyPatch(String runId, QueryPatch patch, int afterSequence) {
        QueryState current = queryStates.get(runId);
        if (current == null) {
            return List.of(errorEvent(runId, Math.max(afterSequence, eventStore.lastSequence(runId)) + 1,
                    new StructuredError("RUN_NOT_FOUND", "分析运行不存在", "找不到可以继续修改的 AnalysisRun。", "重新发起分析后重试。", false)));
        }
        SemanticQuery query = new SemanticQuery(
                patch.metric() == null ? current.query().metric() : patch.metric(),
                patch.dimensions() == null ? current.query().dimensions() : patch.dimensions(),
                patch.timeRange() == null ? current.query().timeRange() : patch.timeRange(),
                patch.comparison() == null ? current.query().comparison() : patch.comparison(),
                patch.limit() == null ? current.query().limit() : patch.limit()
        );
        List<QueryFilter> filters = patch.filters() == null ? current.filters() : patch.filters();
        return execute(runId, query, filters, afterSequence);
    }

    private QueryResult queryResult(CompiledQuery compiled) {
        List<Map<String, Object>> rawRows = jdbcTemplate.queryForList(compiled.statement(), compiled.parameters());
        List<Map<String, Object>> rows = rawRows.stream()
                .map(raw -> {
                    Map<String, Object> row = new LinkedHashMap<>();
                    for (String column : compiled.columns()) row.put(column, normalize(raw.get(column)));
                    return row;
                })
                .toList();
        return new QueryResult(compiled.columns(), rows, false);
    }

    private VerifiedFacts verifiedFacts(SemanticQuery query, QueryResult result) {
        double current = sum(result, "current");
        Double previous = result.columns().contains("previous") ? sum(result, "previous") : null;
        Double change = previous == null || previous == 0 ? null : round(((current - previous) / previous) * 100, 1);
        Map<String, Object> leader = result.rows().get(0);
        String categoryField = query.dimensions().get(0);
        double leaderValue = number(leader.get("current"));
        double share = current == 0 ? 0 : round((leaderValue / current) * 100, 1);
        String label = metricLabel(query.metric());
        var facts = new ArrayList<VerifiedFacts.VerifiedFact>();
        facts.add(new VerifiedFacts.VerifiedFact(query.metric(), label, round(current, 2), "¥" + format(current) + "M", "CNY", change, Map.of()));
        facts.add(new VerifiedFacts.VerifiedFact(
                "top_channel",
                "channel".equals(categoryField) ? "领先渠道" : "领先项",
                leader.get(categoryField),
                "¥" + format(leaderValue) + "M",
                "CNY",
                null,
                Map.of("share", share)
        ));
        facts.add(new VerifiedFacts.VerifiedFact(
                "data_freshness", "数据新鲜度", DATA_AS_OF.toString(), "08:30", null, null,
                Map.of("date", DATA_AS_OF.toLocalDate().toString())
        ));
        return new VerifiedFacts(facts, DATA_AS_OF);
    }

    private ChartIntent chartIntent(SemanticQuery query) {
        List<ChartIntent.ChartSeries> series = "none".equals(query.comparison())
                ? List.of(new ChartIntent.ChartSeries("当前值", "current"))
                : List.of(
                new ChartIntent.ChartSeries("当前值", "current"),
                new ChartIntent.ChartSeries("对比值", "previous")
        );
        return new ChartIntent("bar", query.dimensions().get(0), series);
    }

    private InsightPayload insight(SemanticQuery query, QueryResult result) {
        Map<String, Object> leader = result.rows().get(0);
        String dimension = query.dimensions().get(0);
        String metric = metricLabel(query.metric());
        String comparison = result.columns().contains("change") && leader.get("change") != null
                ? "，变化 " + number(leader.get("change")) + "%"
                : "";
        return new InsightPayload(
                String.valueOf(leader.get(dimension)) + metric + " ¥" + format(number(leader.get("current"))) + "M，排名第一" + comparison + "。",
                "data.rows[" + dimension + "=" + leader.get(dimension) + "]",
                "结果来自已发布语义版本 " + semanticPackage.VERSION + "。"
        );
    }

    private void appendError(List<AgentEvent> events, String runId, int sequence, StructuredError error) {
        append(events, runId, sequence, EventType.ERROR, error);
    }

    private AgentEvent errorEvent(String runId, int sequence, StructuredError error) {
        var event = new AgentEvent(runId, sequence, Instant.now(), EventType.ERROR, objectMapper.valueToTree(error));
        eventStore.append(event);
        return event;
    }

    private void append(List<AgentEvent> events, String runId, int sequence, EventType type, Object payload) {
        JsonNode json = objectMapper.valueToTree(payload);
        var event = new AgentEvent(runId, sequence, Instant.now(), type, json);
        eventStore.append(event);
        events.add(event);
    }

    private double sum(QueryResult result, String column) {
        return result.rows().stream().mapToDouble(row -> number(row.get(column))).sum();
    }

    private Object normalize(Object value) {
        if (value instanceof BigDecimal decimal) return decimal.doubleValue();
        if (value instanceof Number number) return number.doubleValue();
        return value;
    }

    private double number(Object value) {
        return value instanceof Number number ? number.doubleValue() : 0;
    }

    private double round(double value, int scale) {
        double factor = Math.pow(10, scale);
        return Math.round(value * factor) / factor;
    }

    private String format(double value) {
        return String.format(java.util.Locale.ROOT, "%.2f", value);
    }

    private String metricLabel(String metric) {
        return Map.of(
                "net_revenue", "净收入",
                "gmv", "GMV",
                "recognized_revenue", "已确认收入"
        ).getOrDefault(metric, metric);
    }

    private record QueryState(SemanticQuery query, List<QueryFilter> filters) {
    }
}
