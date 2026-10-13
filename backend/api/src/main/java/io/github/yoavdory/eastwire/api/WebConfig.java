package io.github.yoavdory.eastwire.api;

import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/** The API is read-only and may be called only from EastWire's own frontend origins. */
@Configuration
class WebConfig implements WebMvcConfigurer {

    private final List<String> allowedOrigins;

    WebConfig(@Value("${eastwire.cors.allowed-origins}") List<String> allowedOrigins) {
        this.allowedOrigins = allowedOrigins;
    }

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**")
                .allowedOrigins(allowedOrigins.toArray(String[]::new))
                .allowedMethods("GET", "HEAD")
                .maxAge(3600);
    }
}
