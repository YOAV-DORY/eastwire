package io.github.yoavdory.eastwire.ingest;

import io.github.yoavdory.eastwire.core.config.ComplianceConfig;
import io.github.yoavdory.eastwire.core.config.SourceConfig;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

/** One ingestion run. Connectors arrive in milestone 3; for now it syncs config/ and reports. */
@Component
@ConditionalOnProperty(name = "eastwire.ingest.run-on-startup", havingValue = "true", matchIfMissing = true)
class IngestRunner implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(IngestRunner.class);

    private final ComplianceConfig config;
    private final ConfigSync configSync;

    IngestRunner(ComplianceConfig config, ConfigSync configSync) {
        this.config = config;
        this.configSync = configSync;
    }

    @Override
    public void run(ApplicationArguments args) {
        ConfigSync.Result synced = configSync.sync(config);
        log.info("Config synced: {} countries, {} places, {} sources, {} domain policies",
                synced.countries(), synced.places(), synced.sources(), synced.domains());
        config.sources().stream()
                .filter(SourceConfig::enabled)
                .forEach(s -> log.info("Enabled source: {} ({})", s.slug(), s.connector()));
        log.info("No connectors are implemented yet (milestone 3).");
    }
}
