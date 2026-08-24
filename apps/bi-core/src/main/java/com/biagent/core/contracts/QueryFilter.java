package com.biagent.core.contracts;

import jakarta.validation.constraints.NotBlank;

/** 受约束的等值过滤条件。 */
public record QueryFilter(
        @NotBlank String field,
        @NotBlank String operator,
        @NotBlank String value
) {
}
