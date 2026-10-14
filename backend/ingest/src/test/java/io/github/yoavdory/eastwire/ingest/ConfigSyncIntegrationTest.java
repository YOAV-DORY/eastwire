package io.github.yoavdory.eastwire.ingest;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

/** Applies the Flyway migrations to a real Postgres and syncs config/ into it. */
class ConfigSyncIntegrationTest extends PostgresTestBase {

    @Test
    void syncIsIdempotentAndMatchesConfig() {
        configSync.sync(config);

        assertThat(count("SELECT count(*) FROM country")).isEqualTo(config.countries().size());
        assertThat(count("SELECT count(*) FROM place WHERE is_major_city")).isEqualTo(170);
        assertThat(count("SELECT count(*) FROM source")).isEqualTo(config.sources().size());
        assertThat(count("SELECT count(*) FROM domain_policy")).isEqualTo(config.domains().size());
    }

    @Test
    void excludedSourcesAreStoredDisabledAndDeniedDomainsKeepTheirRule() {
        assertThat(count("SELECT count(*) FROM source WHERE status = 'excluded' AND enabled")).isZero();
        assertThat(jdbc.sql("SELECT rule FROM domain_policy WHERE domain = 'scmp.com'").query(String.class).single())
                .isEqualTo("D3");
        assertThat(jdbc.sql("SELECT aliases FROM place WHERE ascii_name = 'Mumbai'").query(String.class).single())
                .isEqualTo("{Bombay}");
    }
}
