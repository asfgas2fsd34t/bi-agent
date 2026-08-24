package com.biagent.core.demo.query;

import java.util.List;
import java.util.Map;

/** 已通过语义校验、等待数据库执行的参数化查询。 */
public record CompiledQuery(
        String statement,
        Map<String, Object> parameters,
        List<String> columns
) {
}
