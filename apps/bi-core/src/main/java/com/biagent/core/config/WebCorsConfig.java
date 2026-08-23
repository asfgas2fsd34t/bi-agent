package com.biagent.core.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * 集中管理浏览器访问 Java 公开 API 的跨域规则。
 *
 * <p>内部的 Python 回传接口不在映射范围内，因此不会开放给浏览器。</p>
 */
@Configuration
public class WebCorsConfig implements WebMvcConfigurer {
    private static final String[] WEB_ORIGINS = {
            "http://127.0.0.1:4173",
            "http://localhost:4173",
            "http://127.0.0.1:4174",
            "http://localhost:4174"
    };

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/v1/demo/**")
                .allowedOrigins(WEB_ORIGINS)
                .allowedMethods("POST", "OPTIONS")
                .allowedHeaders("*");
        registry.addMapping("/api/v1/runs/**")
                .allowedOrigins(WEB_ORIGINS)
                .allowedMethods("GET", "OPTIONS")
                .allowedHeaders("*");
    }
}
