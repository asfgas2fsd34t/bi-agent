package com.biagent.core;

import com.biagent.core.contracts.QueryFilter;
import com.biagent.core.contracts.SemanticQuery;
import com.biagent.core.demo.query.EcommerceSemanticPackage;
import com.biagent.core.demo.query.QueryCompilationException;
import com.biagent.core.demo.query.QueryCompiler;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class QueryCompilerTest {
    private final QueryCompiler compiler = new QueryCompiler(new EcommerceSemanticPackage());

    @Test
    void compilesAValidatedQueryWithBoundFilterValues() {
        var compiled = compiler.compile(
                new SemanticQuery("net_revenue", List.of("channel", "region"), "previous_month", "year_over_year", 10),
                List.of(new QueryFilter("region", "equals", "华东"))
        );

        assertThat(compiled.statement())
                .contains("analytics.channel_revenue", "net_revenue", ":filter_0", ":current_start", "LIMIT :limit")
                .doesNotContain("华东");
        assertThat(compiled.parameters()).containsEntry("filter_0", "华东");
        assertThat(compiled.columns()).containsExactly("channel", "region", "current", "previous", "change");
    }

    @Test
    void rejectsUnknownMembersBeforeBuildingSql() {
        assertThatThrownBy(() -> compiler.compile(
                new SemanticQuery("secret_metric", List.of("channel"), "previous_month", "year_over_year", 10),
                List.of()
        ))
                .isInstanceOf(QueryCompilationException.class)
                .extracting(error -> ((QueryCompilationException) error).error().code())
                .isEqualTo("UNKNOWN_METRIC");

        assertThatThrownBy(() -> compiler.compile(
                new SemanticQuery("net_revenue", List.of("secret_column"), "previous_month", "year_over_year", 10),
                List.of()
        ))
                .isInstanceOf(QueryCompilationException.class)
                .extracting(error -> ((QueryCompilationException) error).error().code())
                .isEqualTo("INCOMPATIBLE_DIMENSION");
    }

    @Test
    void omitsComparisonColumnsWhenComparisonIsNone() {
        var compiled = compiler.compile(
                new SemanticQuery("gmv", List.of("channel"), "previous_month", "none", 5),
                List.of()
        );

        assertThat(compiled.columns()).containsExactly("channel", "current");
        assertThat(compiled.statement()).doesNotContain("previous_start", "previous_value");
    }
}
