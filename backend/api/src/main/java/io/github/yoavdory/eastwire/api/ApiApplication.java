package io.github.yoavdory.eastwire.api;

import io.github.yoavdory.eastwire.core.config.ComplianceConfig;
import io.github.yoavdory.eastwire.core.policy.DisplayPolicy;
import io.github.yoavdory.eastwire.core.sector.SectorRules;
import java.nio.file.Path;
import java.time.Clock;
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

    @Bean
    SectorRules sectorRules(@Value("${eastwire.config-dir}") Path configDir) {
        return SectorRules.load(configDir);
    }

    @Bean
    Clock clock() {
        return Clock.systemUTC();
    }
}
