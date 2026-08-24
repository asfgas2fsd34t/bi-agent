package com.biagent.core.demo.query;

import com.biagent.core.contracts.StructuredError;

/** SemanticQuery 无法映射到已发布语义包时抛出的稳定错误。 */
public final class QueryCompilationException extends RuntimeException {
    private final StructuredError error;

    public QueryCompilationException(StructuredError error) {
        super(error.code() + ": " + error.detail());
        this.error = error;
    }

    public StructuredError error() {
        return error;
    }
}
