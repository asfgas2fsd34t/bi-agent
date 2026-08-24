package com.biagent.core.demo.query;

import com.biagent.core.contracts.QueryFilter;
import com.biagent.core.contracts.SemanticQuery;
import com.biagent.core.contracts.StructuredError;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.Set;

/** 演示用的、已发布且不可变的最小电商语义包。 */
@Component
public final class EcommerceSemanticPackage {
    public static final String VERSION = "ecommerce@3";

    private static final Map<String, String> METRIC_COLUMNS = Map.of(
            "net_revenue", "net_revenue",
            "gmv", "gmv",
            "recognized_revenue", "recognized_revenue"
    );
    private static final Map<String, String> DIMENSION_COLUMNS = Map.of(
            "channel", "channel",
            "region", "region",
            "category", "category"
    );
    private static final Set<String> TIME_RANGES = Set.of("previous_month", "year_to_date", "last_30_days");
    private static final Set<String> COMPARISONS = Set.of("year_over_year", "month_over_month", "none");

    public String metricColumn(String metric) {
        return METRIC_COLUMNS.get(metric);
    }

    public String dimensionColumn(String dimension) {
        return DIMENSION_COLUMNS.get(dimension);
    }

    public String validate(SemanticQuery query, java.util.List<QueryFilter> filters) {
        if (query == null || query.metric() == null || !METRIC_COLUMNS.containsKey(query.metric())) {
            throw invalid("UNKNOWN_METRIC", "无法识别指标", "指标不属于已发布的 ecommerce@3 语义包。", "选择已发布的指标后重试。", false);
        }
        if (query.dimensions() == null || query.dimensions().isEmpty()
                || query.dimensions().stream().anyMatch(dimension -> !DIMENSION_COLUMNS.containsKey(dimension))
                || query.dimensions().stream().distinct().count() != query.dimensions().size()) {
            throw invalid("INCOMPATIBLE_DIMENSION", "维度组合不可用", "查询包含未知、重复或为空的维度组合。", "调整维度组合后重新应用查询。", false);
        }
        if (query.timeRange() == null || !TIME_RANGES.contains(query.timeRange())) {
            throw invalid("INVALID_TIME_RANGE", "时间范围不可用", "时间范围不属于已发布语义包支持的范围。", "选择已发布的时间范围后重试。", false);
        }
        if (query.comparison() == null || !COMPARISONS.contains(query.comparison())) {
            throw invalid("INVALID_COMPARISON", "比较方式不可用", "比较方式不属于已发布语义包支持的范围。", "选择同比、环比或无对比后重试。", false);
        }
        if (query.limit() < 1 || query.limit() > 1000) {
            throw invalid("INVALID_LIMIT", "结果数量不可用", "结果数量必须在 1 到 1000 之间。", "调整结果数量后重试。", false);
        }
        if (filters != null) {
            for (QueryFilter filter : filters) {
                if (filter == null || !DIMENSION_COLUMNS.containsKey(filter.field())) {
                    throw invalid("UNKNOWN_FILTER_FIELD", "筛选字段不可用", "筛选条件只能引用已发布的维度。", "调整筛选条件后重试。", false);
                }
                if (!"equals".equals(filter.operator()) || filter.value() == null || filter.value().isBlank()) {
                    throw invalid("UNSUPPORTED_FILTER", "筛选条件不可用", "当前只支持非空值的等值筛选。", "调整筛选条件后重试。", false);
                }
            }
            if (filters.stream().map(QueryFilter::field).distinct().count() != filters.size()) {
                throw invalid("DUPLICATE_FILTER", "筛选条件不可用", "同一个维度只能出现一个筛选条件。", "合并重复筛选条件后重试。", false);
            }
        }
        return VERSION;
    }

    private QueryCompilationException invalid(String code, String title, String detail, String action, boolean retryable) {
        return new QueryCompilationException(new StructuredError(code, title, detail, action, retryable));
    }
}
