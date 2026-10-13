package io.github.yoavdory.eastwire.api;

import io.github.yoavdory.eastwire.core.config.ComplianceConfig;
import io.github.yoavdory.eastwire.core.policy.DisplayPolicy;
import java.nio.file.Path;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;

/** EastWire's public read-only API. */
@SpringBootApplication
public class ApiApplication {

    public static void main(String[] args) {
        SpringApplication.run(ApiApplication.class, args);
    }

    @Bean
    ComplianceConfig complianceConfig(@Value("${eastwire.config-dir}") Path configDir) {
        return ComplianceConfig.load(configDir);
    }

    @Bean
    DisplayPolicy displayPolicy(ComplianceConfig config) {
        return new DisplayPolicy(config);
    }
}
