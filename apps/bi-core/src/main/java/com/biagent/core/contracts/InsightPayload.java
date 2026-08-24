package com.biagent.core.contracts;

import jakarta.validation.constraints.NotBlank;

/** 基于可验证事实生成的业务洞察。 */
public record InsightPayload(
        @NotBlank String claim,
        @NotBlank String evidence,
        String limitation
) {
}
