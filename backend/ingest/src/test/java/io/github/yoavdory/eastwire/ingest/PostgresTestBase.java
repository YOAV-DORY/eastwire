package io.github.yoavdory.eastwire.ingest;

import io.github.yoavdory.eastwire.core.config.ComplianceConfig;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;
import org.testcontainers.utility.DockerImageName;

/**
 * Real Postgres (Testcontainers) with migrations applied and config/ synced; each test starts
 * from empty article tables. Needs Docker: skipped locally without it, always run in CI.
 */
@SpringBootTest(properties = "eastwire.ingest.run-on-startup=false")
@Testcontainers(disabledWithoutDocker = true)
public abstract class PostgresTestBase {

    @Container
    @ServiceConnection
    static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer(DockerImageName.parse("postgres:17-alpine"));

    @Autowired
    protected JdbcClient jdbc;

    @Autowired
    protected ComplianceConfig config;

    @Autowired
    protected ConfigSync configSync;

    @BeforeEach
    void resetDatabase() {
        jdbc.sql("TRUNCATE article, article_location, article_sector, story_cluster, suppression, ingestion_run, "
                + "source_status, fetch_state RESTART IDENTITY CASCADE").update();
        configSync.sync(config);
    }

    protected long count(String sql) {
        return jdbc.sql(sql).query(Long.class).single();
    }
}
