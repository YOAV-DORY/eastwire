package io.github.yoavdory.eastwire.ingest;

import io.github.yoavdory.eastwire.core.config.ComplianceConfig;
import io.github.yoavdory.eastwire.core.config.QualityRules;
import io.github.yoavdory.eastwire.core.geo.Gazetteer;
import io.github.yoavdory.eastwire.core.policy.DisplayPolicy;
import io.github.yoavdory.eastwire.core.sector.SectorClassifier;
import io.github.yoavdory.eastwire.core.sector.SectorRules;
import io.github.yoavdory.eastwire.core.social.SocialAccounts;
import io.github.yoavdory.eastwire.ingest.http.HttpFetcher;
import java.nio.file.Path;
import java.time.Clock;
import java.time.Duration;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;

/**
 * Entry point of the hourly ingestion job. Runs once and exits; a non-zero exit code (all
 * connectors failed) makes the GitHub Actions run fail, which emails the repository owner.
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

    @Bean
    DisplayPolicy displayPolicy(ComplianceConfig config) {
        return new DisplayPolicy(config);
    }

    @Bean
    SectorClassifier sectorClassifier(@Value("${eastwire.config-dir}") Path configDir) {
        return new SectorClassifier(SectorRules.load(configDir));
    }

    @Bean
    QualityRules qualityRules(@Value("${eastwire.config-dir}") Path configDir) {
        return QualityRules.load(configDir);
    }

    @Bean
    SocialAccounts socialAccounts(@Value("${eastwire.config-dir}") Path configDir, ComplianceConfig config) {
        return SocialAccounts.load(configDir, config);
    }

    @Bean
    Gazetteer gazetteer(ComplianceConfig config) {
        return new Gazetteer(config.cities(), config.activeCountries(), config.requiresCountryContext());
    }

    @Bean
    Clock clock() {
        return Clock.systemUTC();
    }

    @Bean
    HttpFetcher httpFetcher(
            @Value("${eastwire.http.user-agent}") String userAgent,
            @Value("${eastwire.http.connect-timeout}") Duration connectTimeout,
            @Value("${eastwire.http.request-timeout}") Duration requestTimeout,
            @Value("${eastwire.http.max-attempts}") int maxAttempts,
            @Value("${eastwire.http.base-delay}") Duration baseDelay,
            @Value("${eastwire.http.max-retry-after}") Duration maxRetryAfter) {
        return new HttpFetcher(userAgent, connectTimeout, requestTimeout, maxAttempts, baseDelay, maxRetryAfter,
                duration -> Thread.sleep(duration));
    }
}
