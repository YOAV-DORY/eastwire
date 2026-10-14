package io.github.yoavdory.eastwire.ingest;

import io.github.yoavdory.eastwire.core.config.ComplianceConfig;
import io.github.yoavdory.eastwire.core.config.SourceConfig;
import io.github.yoavdory.eastwire.core.social.SocialAccounts;
import io.github.yoavdory.eastwire.ingest.http.HttpFetcher;
import io.github.yoavdory.eastwire.ingest.pipeline.RetentionPurger;
import io.github.yoavdory.eastwire.ingest.pipeline.SectorTagger;
import io.github.yoavdory.eastwire.ingest.social.SocialLinker;
import io.github.yoavdory.eastwire.ingest.run.CircuitBreaker;
import io.github.yoavdory.eastwire.ingest.run.RunOutcome;
import io.github.yoavdory.eastwire.ingest.run.RunRecorder;
import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import javax.sql.DataSource;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

/**
 * One ingestion run:
 * take the advisory lock (so overlapping runs never collide) → sync config/ →
 * run each enabled source's connector unless its circuit is open → re-tag sectors of stored
 * articles if config/sectors.yaml changed → link social posts to stories → purge expired and
 * taken-down items → fail the process only if every attempted connector failed.
 */
@Component
@ConditionalOnProperty(name = "eastwire.ingest.run-on-startup", havingValue = "true", matchIfMissing = true)
class IngestRunner implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(IngestRunner.class);
    /** Arbitrary but fixed key for pg_try_advisory_lock ("EASTWIRE" on a phone keypad, roughly). */
    static final long LOCK_KEY = 32_789_473L;

    private final ComplianceConfig config;
    private final ConfigSync configSync;
    private final RunRecorder recorder;
    private final RetentionPurger purger;
    private final SectorTagger sectors;
    private final SocialAccounts socialAccounts;
    private final SocialLinker socialLinker;
    private final Map<String, Connector> connectors;
    private final DataSource dataSource;
    private final Clock clock;
    private final boolean useLock;

    IngestRunner(ComplianceConfig config, ConfigSync configSync, RunRecorder recorder, RetentionPurger purger,
            SectorTagger sectors, SocialAccounts socialAccounts, SocialLinker socialLinker, List<Connector> connectors, DataSource dataSource, Clock clock,
            @Value("${eastwire.ingest.advisory-lock}") boolean useLock) {
        this.config = config;
        this.configSync = configSync;
        this.recorder = recorder;
        this.purger = purger;
        this.sectors = sectors;
        this.socialAccounts = socialAccounts;
        this.socialLinker = socialLinker;
        this.connectors = connectors.stream().collect(Collectors.toMap(Connector::sourceSlug, Function.identity()));
        this.dataSource = dataSource;
        this.clock = clock;
        this.useLock = useLock;
    }

    @Override
    public void run(ApplicationArguments args) throws SQLException {
        if (!useLock) {
            runOnce();
            return;
        }
        try (Connection lockConnection = dataSource.getConnection()) {
            if (!tryLock(lockConnection)) {
                log.warn("Another ingestion run holds the lock; exiting without doing anything.");
                return;
            }
            try {
                runOnce();
            } finally {
                unlock(lockConnection);
            }
        }
    }

    void runOnce() {
        ConfigSync.Result synced = configSync.sync(config);
        log.info("Config synced: {} countries, {} places, {} sources, {} domain policies",
                synced.countries(), synced.places(), synced.sources(), synced.domains());
        log.info("Social accounts synced: {}", configSync.syncSocial(socialAccounts));

        int attempted = 0;
        int failed = 0;
        for (SourceConfig source : config.sources()) {
            if (!source.enabled()) {
                continue;
            }
            Connector connector = connectors.get(source.slug());
            if (connector == null) {
                log.info("{}: enabled but no connector is implemented yet", source.slug());
                continue;
            }
            short sourceId = recorder.sourceId(source.slug()).orElseThrow();
            RunRecorder.SourceState state = recorder.state(sourceId);
            Instant now = clock.instant();
            if (CircuitBreaker.isOpen(state.circuitOpenUntil(), now)) {
                log.warn("{}: circuit open until {} after {} failures; skipping", source.slug(),
                        state.circuitOpenUntil(), state.consecutiveFailures());
                recorder.skipped(sourceId, "circuit open until " + state.circuitOpenUntil(), now);
                continue;
            }

            attempted++;
            long runId = recorder.start(sourceId, state.cursor(), now);
            RunOutcome outcome;
            try {
                outcome = connector.run(new Connector.Context(source, sourceId, state.cursor(), now));
            } catch (RuntimeException e) {
                Integer status = e instanceof HttpFetcher.FetchException fe && fe.status() > 0 ? fe.status() : null;
                log.error("{}: run failed", source.slug(), e);
                outcome = RunOutcome.failed(e, status);
            }
            recorder.finish(runId, state, outcome, clock.instant());
            if (!outcome.madeProgress()) {
                failed++;
            }
            log.info("{}: {} ({} seen, {} new)", source.slug(), outcome.status(), outcome.itemsSeen(), outcome.itemsNew());
        }

        int retagged = sectors.retagStale();
        if (retagged > 0) {
            log.info("Re-tagged sectors of {} stored articles (rules changed or never tagged)", retagged);
        }

        SocialLinker.Result links = socialLinker.link();
        if (links.sharedUrl() + links.textOverlap() > 0) {
            log.info("Linked social posts to stories: {} by shared URL, {} by headline", links.sharedUrl(), links.textOverlap());
        }

        RetentionPurger.Result purged = purger.purge();
        log.info("Purged {} expired and {} taken-down articles, {} social items", purged.expired(), purged.suppressed(),
                purged.socialExpired());

        if (attempted > 0 && failed == attempted) {
            throw new IllegalStateException("All " + attempted + " connector(s) failed");
        }
    }

    private static boolean tryLock(Connection c) throws SQLException {
        try (Statement s = c.createStatement(); ResultSet rs = s.executeQuery("SELECT pg_try_advisory_lock(" + LOCK_KEY + ")")) {
            return rs.next() && rs.getBoolean(1);
        }
    }

    private static void unlock(Connection c) throws SQLException {
        try (Statement s = c.createStatement()) {
            s.execute("SELECT pg_advisory_unlock(" + LOCK_KEY + ")");
        }
    }
}
