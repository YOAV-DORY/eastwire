package io.github.yoavdory.eastwire.ingest;

import static org.assertj.core.api.Assertions.assertThat;

import io.github.yoavdory.eastwire.core.config.ComplianceConfig;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;
import org.testcontainers.utility.DockerImageName;

/**
 * Applies the Flyway migrations to a real Postgres and syncs config/ into it.
 * Needs Docker; skipped locally without it, always run in CI.
 */
@SpringBootTest(properties = "eastwire.ingest.run-on-startup=false")
@Testcontainers(disabledWithoutDocker = true)
class ConfigSyncIntegrationTest {

    @Container
    @ServiceConnection
    static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer(DockerImageName.parse("postgres:17-alpine"));

    @Autowired
    ConfigSync configSync;

    @Autowired
    ComplianceConfig config;

    @Autowired
    JdbcClient jdbc;

    @Test
    void syncIsIdempotentAndMatchesConfig() {
        configSync.sync(config);
        configSync.sync(config);

        assertThat(count("SELECT count(*) FROM country")).isEqualTo(config.countries().size());
        assertThat(count("SELECT count(*) FROM place WHERE is_major_city")).isEqualTo(170);
        assertThat(count("SELECT count(*) FROM source")).isEqualTo(config.sources().size());
        assertThat(count("SELECT count(*) FROM domain_policy")).isEqualTo(config.domains().size());
    }

    @Test
    void excludedSourcesAreStoredDisabledAndDeniedDomainsKeepTheirRule() {
        configSync.sync(config);

        assertThat(count("SELECT count(*) FROM source WHERE status = 'excluded' AND enabled")).isZero();
        assertThat(jdbc.sql("SELECT rule FROM domain_policy WHERE domain = 'scmp.com'").query(String.class).single())
                .isEqualTo("D3");
        assertThat(jdbc.sql("SELECT aliases FROM place WHERE ascii_name = 'Mumbai'").query(String.class).single())
                .isEqualTo("{Bombay}");
    }

    private long count(String sql) {
        return jdbc.sql(sql).query(Long.class).single();
    }
}
