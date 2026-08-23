package com.biagent.core;

import com.biagent.core.contracts.AgentEvent;
import com.biagent.core.contracts.AnalysisRun;
import com.biagent.core.contracts.ChartIntent;
import com.biagent.core.contracts.EventType;
import com.biagent.core.contracts.QueryResult;
import com.biagent.core.contracts.SemanticQuery;
import com.biagent.core.contracts.StructuredError;
import com.biagent.core.contracts.VerifiedFacts;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.junit.jupiter.api.Test;

import java.nio.file.Files;
import java.nio.file.Path;

import static org.assertj.core.api.Assertions.assertThat;

class ContractCompatibilityTest {
    private final ObjectMapper mapper = new ObjectMapper().registerModule(new JavaTimeModule());
    private final Path fixtures = Path.of("..", "..", "contracts", "fixtures", "v1");

    @Test
    void sharedFixturesDeserializeIntoJavaDtos() throws Exception {
        SemanticQuery semanticQuery = read("semantic-query.json", SemanticQuery.class);
        AnalysisRun analysisRun = read("analysis-run.json", AnalysisRun.class);
        AgentEvent event = read("agent-event.json", AgentEvent.class);
        StructuredError error = read("structured-error.json", StructuredError.class);
        QueryResult result = read("query-result.json", QueryResult.class);
        VerifiedFacts facts = read("verified-facts.json", VerifiedFacts.class);
        ChartIntent chart = read("chart-intent.json", ChartIntent.class);

        assertThat(semanticQuery.metric()).isEqualTo("net_revenue");
        assertThat(analysisRun.workspaceId()).isEqualTo("demo-workspace");
        assertThat(event.eventType()).isEqualTo(EventType.STATUS);
        assertThat(event.payload().path("status").asText()).isEqualTo("running");
        assertThat(error.retryable()).isFalse();
        assertThat(result.rows()).hasSize(2);
        assertThat(facts.facts()).hasSize(3);
        assertThat(facts.facts().get(0).key()).isEqualTo("net_revenue");
        assertThat(facts.facts().get(1).attributes().get("share")).isEqualTo(38.6);
        assertThat(chart.kind()).isEqualTo("bar");
    }

    private <T> T read(String name, Class<T> type) throws Exception {
        JsonNode json = mapper.readTree(Files.readString(fixtures.resolve(name)));
        return mapper.treeToValue(json, type);
    }
}
