package io.github.yoavdory.eastwire.api.status;

import io.github.yoavdory.eastwire.core.config.ComplianceConfig;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import java.util.Objects;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Freshness, in two views.
 *
 * <p><b>For readers</b> ({@code updatedAt}, {@code updateState}): when EastWire last refreshed
 * its news, i.e. the <em>newest</em> successful source check. Ingestion runs about hourly but
 * schedulers can delay a run, so this only turns "stale" after {@link READER_STALE_AFTER}
 * (several missed runs in a row) and "outage" after a day. That is the only freshness the home
 * page shows.
 *
 * <p><b>Per source</b> ({@code sources[].state}, {@code state}, {@code lastSuccessAt}): the
 * Sources page's health detail. The overall operator time is the <em>oldest</em> last success,
 * so one failing source can't hide behind a fresh one. A source is "fresh" for
 * {@link SOURCE_STALE_AFTER}, allowing one late hourly run.
 */
@RestController
class StatusController {

    static final Duration SOURCE_STALE_AFTER = Duration.ofHours(3);
    static final Duration READER_STALE_AFTER = Duration.ofHours(6);
    static final Duration OUTAGE_AFTER = Duration.ofHours(24);

    record SourceStatus(
            String slug,
            String name,
            String state,
            Instant lastAttemptAt,
            Instant lastSuccessAt,
            Instant newestItemAt,
            int consecutiveFailures,
            boolean circuitOpen,
            Instant newestPublishedAt,
            Instant lastStoredAt) {
    }

    /** @param state ok, or warn once the database nears the free tier's limit */
    record Database(long sizeBytes, long limitBytes, String state) {
    }

    /**
     * @param updateState reader view: fresh, stale, outage or unknown, from {@code updatedAt}
     * @param updatedAt   newest successful check of any enabled source
     * @param state       operator view, from the oldest last success ({@code lastSuccessAt})
     */
    record Status(String updateState, Instant updatedAt, String state, Instant lastSuccessAt, List<SourceStatus> sources,
            Database database) {
    }

    private final StatusRepository repository;
    private final ComplianceConfig config;
    private final Clock clock;
    private final long databaseLimit;
    private final long databaseWarn;

    StatusController(StatusRepository repository, ComplianceConfig config, Clock clock,
            @Value("${eastwire.status.database-limit-bytes}") long databaseLimit,
            @Value("${eastwire.status.database-warn-bytes}") long databaseWarn) {
        this.repository = repository;
        this.config = config;
        this.clock = clock;
        this.databaseLimit = databaseLimit;
        this.databaseWarn = databaseWarn;
    }

    @GetMapping("/api/v1/status")
    ResponseEntity<Status> status() {
        Instant now = clock.instant();
        List<SourceStatus> sources = repository.enabledSources().stream()
                .map(r -> new SourceStatus(r.slug(),
                        config.source(r.slug()).map(s -> s.publisher() != null ? s.publisher() : s.name()).orElse(r.slug()),
                        state(r.lastSuccessAt(), now), r.lastAttemptAt(), r.lastSuccessAt(), r.newestItemAt(),
                        r.consecutiveFailures(), r.circuitOpenUntil() != null && now.isBefore(r.circuitOpenUntil()),
                        r.newestPublishedAt(), r.lastStoredAt()))
                .toList();
        boolean anyNeverRan = sources.isEmpty() || sources.stream().anyMatch(s -> s.lastSuccessAt() == null);
        Instant oldest = sources.stream().map(SourceStatus::lastSuccessAt).filter(Objects::nonNull)
                .min(Comparator.naturalOrder()).orElse(null);
        String overall = anyNeverRan && oldest == null ? "unknown" : state(anyNeverRan ? null : oldest, now);
        Instant newest = sources.stream().map(SourceStatus::lastSuccessAt).filter(Objects::nonNull)
                .max(Comparator.naturalOrder()).orElse(null);
        return ResponseEntity.ok()
                .cacheControl(CacheControl.maxAge(Duration.ofSeconds(30)).cachePublic())
                .body(new Status(readerState(newest, now), newest, overall, anyNeverRan ? null : oldest, sources, database()));
    }

    private Database database() {
        long size = repository.databaseBytes();
        return new Database(size, databaseLimit, size >= databaseWarn ? "warn" : "ok");
    }

    /** One source's (or the oldest) check: fresh for {@link SOURCE_STALE_AFTER}. */
    static String state(Instant lastSuccess, Instant now) {
        return classify(lastSuccess, now, SOURCE_STALE_AFTER);
    }

    /** What a reader is told: stale only after {@link READER_STALE_AFTER} without any refresh. */
    static String readerState(Instant lastUpdate, Instant now) {
        return classify(lastUpdate, now, READER_STALE_AFTER);
    }

    private static String classify(Instant at, Instant now, Duration staleAfter) {
        if (at == null) {
            return "unknown";
        }
        Duration age = Duration.between(at, now);
        if (age.isNegative() || age.compareTo(staleAfter) < 0) {
            return "fresh";
        }
        return age.compareTo(OUTAGE_AFTER) < 0 ? "stale" : "outage";
    }
}
