package io.github.yoavdory.eastwire.ingest;

import io.github.yoavdory.eastwire.core.config.ComplianceConfig;
import java.nio.file.Path;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;

/**
 * Entry point of the hourly ingestion job. Runs once and exits; the exit code tells
 * GitHub Actions whether the run failed.
 */
@SpringBootApplication
public class IngestApplication {

    public static void main(String[] args) {
        System.exit(SpringApplication.exit(SpringApplication.run(IngestApplication.class, args)));
    }

    @Bean
    ComplianceConfig complianceConfig(@Value("${eastwire.config-dir}") Path configDir) {
        return ComplianceConfig.load(configDir);
    }
}
