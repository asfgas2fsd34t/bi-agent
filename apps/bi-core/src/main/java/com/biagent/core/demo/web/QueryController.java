package com.biagent.core.demo.web;

import com.biagent.core.contracts.AgentEvent;
import com.biagent.core.contracts.QueryPatch;
import com.biagent.core.demo.query.QueryExecutionService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * 接收已验证界面提交的 Query Patch，并返回新的 typed artifacts。
 *
 * <p>使用场景：用户在已有分析结果上调整指标、维度、时间范围或筛选条件后，重新执行查询。
 * 首次分析不使用此控制器。</p>
 */
@RestController
@RequestMapping("/api/v1/runs")
public class QueryController {
    private final QueryExecutionService queryExecutionService;

    public QueryController(QueryExecutionService queryExecutionService) {
        this.queryExecutionService = queryExecutionService;
    }

    /**
     * 重新执行当前 AnalysisRun 的结构化查询。
     *
     * <p>使用场景：提交当前 AnalysisRun 的结构化查询修改，并返回更新后的分析结果。</p>
     */
    @PostMapping("/{runId}/query")
    public List<AgentEvent> applyQueryPatch(
            @PathVariable String runId,
            @RequestParam(name = "after_sequence", defaultValue = "0") int afterSequence,
            @Valid @RequestBody QueryPatch patch
    ) {
        return queryExecutionService.applyPatch(runId, patch, afterSequence);
    }
}
