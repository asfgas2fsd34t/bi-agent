package com.biagent.core.web;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/** 提供 BI Core 的基础健康检查。 */
@RestController
public class HealthController {
    /** 返回服务是否可以接收请求。 */
    @GetMapping("/health")
    public Map<String, String> health() {
        return Map.of("service", "bi-core", "status", "UP");
    }
}
