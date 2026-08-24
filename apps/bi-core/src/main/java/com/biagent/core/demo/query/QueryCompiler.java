package com.biagent.core.demo.query;

import com.biagent.core.contracts.QueryFilter;
import com.biagent.core.contracts.SemanticQuery;
import org.springframework.stereotype.Service;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/** 将 SemanticQuery 编译成只引用固定物理对象的参数化 PostgreSQL 查询。 */
@Service
public final class QueryCompiler {
    private static final String TABLE = "analytics.channel_revenue";
    private static final ZoneOffset UTC = ZoneOffset.UTC;
    private final EcommerceSemanticPackage semanticPackage;

    public QueryCompiler(EcommerceSemanticPackage semanticPackage) {
        this.semanticPackage = semanticPackage;
    }

    public CompiledQuery compile(SemanticQuery query, List<QueryFilter> filters) {
        semanticPackage.validate(query, filters);

        List<String> dimensions = query.dimensions().stream()
                .map(semanticPackage::dimensionColumn)
                .toList();
        String dimensionSelect = dimensions.stream()
                .map(dimension -> dimension + " AS " + dimension)
                .collect(Collectors.joining(", "));
        String dimensionGroup = String.join(", ", dimensions);
        String filterSql = compileFilters(filters);
        TimeWindow window = timeWindow(query.timeRange(), query.comparison());
        Map<String, Object> parameters = new LinkedHashMap<>();
        parameters.put("current_start", window.currentStart());
        parameters.put("current_end", window.currentEnd());
        parameters.put("limit", query.limit());
        if (!"none".equals(query.comparison())) {
            parameters.put("previous_start", window.previousStart());
            parameters.put("previous_end", window.previousEnd());
        }
        addFilterParameters(parameters, filters);

        String metric = semanticPackage.metricColumn(query.metric());
        if ("none".equals(query.comparison())) {
            String statement = "SELECT " + dimensionSelect + ", ROUND(SUM(" + metric + ")::numeric, 2) AS current "
                    + "FROM " + TABLE + " "
                    + "WHERE occurred_at >= :current_start AND occurred_at < :current_end"
                    + filterSql + " "
                    + "GROUP BY " + dimensionGroup + " "
                    + "ORDER BY current DESC LIMIT :limit";
            return new CompiledQuery(statement, parameters, append(dimensions, "current"));
        }

        String statement = "WITH grouped AS ("
                + "SELECT " + dimensionSelect + ", "
                + "SUM(CASE WHEN occurred_at >= :current_start AND occurred_at < :current_end THEN " + metric + " ELSE 0 END) AS current_value, "
                + "SUM(CASE WHEN occurred_at >= :previous_start AND occurred_at < :previous_end THEN " + metric + " ELSE 0 END) AS previous_value "
                + "FROM " + TABLE + " "
                + "WHERE occurred_at >= :previous_start AND occurred_at < :current_end"
                + filterSql + " "
                + "GROUP BY " + dimensionGroup
                + ") SELECT " + dimensionGroup + ", "
                + "ROUND(current_value::numeric, 2) AS current, "
                + "ROUND(previous_value::numeric, 2) AS previous, "
                + "ROUND(((current_value - previous_value) / NULLIF(previous_value, 0) * 100)::numeric, 1) AS change "
                + "FROM grouped ORDER BY current_value DESC LIMIT :limit";
        return new CompiledQuery(statement, parameters, append(dimensions, "current", "previous", "change"));
    }

    private String compileFilters(List<QueryFilter> filters) {
        if (filters == null || filters.isEmpty()) return "";
        return filters.stream()
                .map(filter -> " AND " + semanticPackage.dimensionColumn(filter.field()) + " = :filter_" + filters.indexOf(filter))
                .collect(Collectors.joining());
    }

    private void addFilterParameters(Map<String, Object> parameters, List<QueryFilter> filters) {
        if (filters == null) return;
        for (int index = 0; index < filters.size(); index++) {
            parameters.put("filter_" + index, filters.get(index).value());
        }
    }

    private TimeWindow timeWindow(String timeRange, String comparison) {
        OffsetDateTime currentStart;
        OffsetDateTime currentEnd;
        OffsetDateTime previousStart;
        OffsetDateTime previousEnd;
        switch (timeRange) {
            case "previous_month" -> {
                currentStart = at("2026-07-01T00:00:00Z");
                currentEnd = at("2026-08-01T00:00:00Z");
                previousStart = "year_over_year".equals(comparison) ? at("2025-07-01T00:00:00Z") : at("2026-06-01T00:00:00Z");
                previousEnd = "year_over_year".equals(comparison) ? at("2025-08-01T00:00:00Z") : at("2026-07-01T00:00:00Z");
            }
            case "year_to_date" -> {
                currentStart = at("2026-01-01T00:00:00Z");
                currentEnd = at("2026-09-01T00:00:00Z");
                previousStart = "year_over_year".equals(comparison) ? at("2025-01-01T00:00:00Z") : at("2025-05-01T00:00:00Z");
                previousEnd = "year_over_year".equals(comparison) ? at("2025-09-01T00:00:00Z") : at("2025-09-01T00:00:00Z");
            }
            case "last_30_days" -> {
                currentStart = at("2026-07-02T00:00:00Z");
                currentEnd = at("2026-08-01T00:00:00Z");
                previousStart = "year_over_year".equals(comparison) ? at("2025-07-03T00:00:00Z") : at("2026-06-02T00:00:00Z");
                previousEnd = "year_over_year".equals(comparison) ? at("2025-08-02T00:00:00Z") : at("2026-07-02T00:00:00Z");
            }
            default -> throw new IllegalArgumentException("Validated time range expected");
        }
        return new TimeWindow(currentStart, currentEnd, previousStart, previousEnd);
    }

    private OffsetDateTime at(String value) {
        return OffsetDateTime.parse(value).withOffsetSameInstant(UTC);
    }

    private List<String> append(List<String> fields, String... additions) {
        var result = new ArrayList<>(fields);
        result.addAll(List.of(additions));
        return List.copyOf(result);
    }

    private record TimeWindow(
            OffsetDateTime currentStart,
            OffsetDateTime currentEnd,
            OffsetDateTime previousStart,
            OffsetDateTime previousEnd
    ) {
    }
}
