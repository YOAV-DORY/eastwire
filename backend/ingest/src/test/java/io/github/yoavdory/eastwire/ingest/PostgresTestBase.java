package io.github.yoavdory.eastwire.ingest;

import io.github.yoavdory.eastwire.core.config.ComplianceConfig;
import io.github.yoavdory.eastwire.core.social.SocialAccounts;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;
import org.testcontainers.utility.DockerImageName;

/**
 * Real Postgres (Testcontainers) with migrations applied and config/ synced; each test starts
 * from empty article tables. Needs Docker: skipped locally without it, always run in CI.
 *
 * <p>The container is a Spring bean, so it lives exactly as long as the (cached) application
 * context that points at it. A JUnit {@code @Container} field would be stopped after the
 * first test class while Spring kept reusing a context aimed at its old port.
 */
@SpringBootTest(properties = "eastwire.ingest.run-on-startup=false")
@Import(PostgresTestBase.Containers.class)
@Testcontainers(disabledWithoutDocker = true)
public abstract class PostgresTestBase {

    @TestConfiguration(proxyBeanMethods = false)
    static class Containers {

        @Bean
        @ServiceConnection
        PostgreSQLContainer postgres() {
            return new PostgreSQLContainer(DockerImageName.parse("postgres:17-alpine"));
        }
    }

    @Autowired
    protected JdbcClient jdbc;

    @Autowired
    protected ComplianceConfig config;

    @Autowired
    protected ConfigSync configSync;

    @Autowired
    protected SocialAccounts socialAccounts;

    @BeforeEach
    void resetDatabase() {
        jdbc.sql("TRUNCATE article, article_location, article_sector, story_cluster, suppression, ingestion_run, "
                + "source_status, fetch_state, social_link, social_item RESTART IDENTITY CASCADE").update();
        configSync.sync(config);
        configSync.syncSocial(socialAccounts);
    }

    protected long count(String sql) {
        return jdbc.sql(sql).query(Long.class).single();
    }
}
