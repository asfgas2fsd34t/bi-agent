package com.biagent.core;

import com.biagent.core.contracts.AgentEvent;
import com.biagent.core.contracts.EventType;
import com.biagent.core.contracts.QueryFilter;
import com.biagent.core.contracts.QueryPatch;
import com.biagent.core.contracts.SemanticQuery;
import com.biagent.core.demo.query.QueryExecutionService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@Testcontainers
class QueryExecutionIntegrationTest {
    @Container
    static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:16-alpine")
            .withDatabaseName("bi_agent")
            .withUsername("bi_agent")
            .withPassword("bi_agent_test")
            .withInitScript("db/ecommerce.sql");

    @DynamicPropertySource
    static void postgresProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
    }

    @Autowired
    private QueryExecutionService queryExecutionService;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void executesAgainstTheFixedPostgresSnapshotAndPublishesArtifacts() {
        List<AgentEvent> events = queryExecutionService.execute(
                "run-integration-1",
                new SemanticQuery("net_revenue", List.of("channel"), "previous_month", "year_over_year", 10),
                List.of(new QueryFilter("region", "equals", "华东")),
                0
        );

        assertThat(events).extracting(AgentEvent::eventType)
                .containsExactly(EventType.STATUS, EventType.SEMANTIC_QUERY, EventType.SQL, EventType.DATA,
                        EventType.VERIFIED_FACTS, EventType.CHART, EventType.INSIGHT, EventType.STATUS);

        AgentEvent sql = events.stream().filter(event -> event.eventType() == EventType.SQL).findFirst().orElseThrow();
        assertThat(sql.payload().path("statement").asText()).contains("analytics.channel_revenue", ":filter_0").doesNotContain("华东");

        AgentEvent data = events.stream().filter(event -> event.eventType() == EventType.DATA).findFirst().orElseThrow();
        assertThat(data.payload().path("rows")).hasSize(3);
        assertThat(data.payload().path("rows").get(0).path("channel").asText()).isEqualTo("抖音");
        assertThat(data.payload().path("rows").get(0).path("current").asDouble()).isEqualTo(4.82);
    }

    @Test
    void returnsAStableErrorForAnUnknownMetricWithoutExecutingSql() {
        List<AgentEvent> events = queryExecutionService.execute(
                "run-integration-invalid",
                new SemanticQuery("not_published", List.of("channel"), "previous_month", "year_over_year", 10),
                List.of(),
                0
        );

        AgentEvent error = events.stream().filter(event -> event.eventType() == EventType.ERROR).findFirst().orElseThrow();
        assertThat(error.payload().path("code").asText()).isEqualTo("UNKNOWN_METRIC");
        assertThat(events).extracting(AgentEvent::eventType).contains(EventType.STATUS);
    }

    @Test
    void appliesAQueryPatchAgainstTheCurrentAnalysisContext() {
        queryExecutionService.execute(
                "run-integration-patch",
                new SemanticQuery("net_revenue", List.of("channel"), "previous_month", "year_over_year", 10),
                List.of(),
                0
        );

        List<AgentEvent> events = queryExecutionService.applyPatch(
                "run-integration-patch",
                new QueryPatch(
                        "gmv", List.of("channel", "region"), "year_to_date", "month_over_month", 10,
                        List.of(new QueryFilter("region", "equals", "华东"))
                ),
                8
        );

        AgentEvent query = events.stream().filter(event -> event.eventType() == EventType.SEMANTIC_QUERY).findFirst().orElseThrow();
        AgentEvent data = events.stream().filter(event -> event.eventType() == EventType.DATA).findFirst().orElseThrow();
        assertThat(query.payload().path("metric").asText()).isEqualTo("gmv");
        assertThat(query.payload().path("dimensions")).hasSize(2);
        assertThat(data.payload().path("columns").toString()).contains("region");
        assertThat(events.get(events.size() - 1).eventType()).isEqualTo(EventType.STATUS);
    }
}
