package com.biagent.core.contracts;

import jakarta.validation.constraints.NotBlank;

/**
 * 面向用户或上层服务的结构化错误信息。
 *
 * @param code      稳定的错误编码
 * @param title     错误标题
 * @param detail    错误详情
 * @param action    建议采取的动作
 * @param retryable 是否允许重试
 */
public record StructuredError(
        @NotBlank String code,
        @NotBlank String title,
        @NotBlank String detail,
        @NotBlank String action,
        Boolean retryable
) {
}
