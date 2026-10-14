package io.github.yoavdory.eastwire.api.status;

import io.github.yoavdory.eastwire.core.config.ComplianceConfig;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import java.util.Objects;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Freshness for the site's "Updated 12 min ago" indicator and the /status page.
 *
 * <p>The overall time is the <em>oldest</em> last success among enabled sources, so one
 * failing source can't hide behind a fresh one. States: fresh (under 2 h), stale (under
 * 24 h), outage (24 h or more), unknown (never ran).
 */
@RestController
class StatusController {

    static final Duration STALE_AFTER = Duration.ofHours(2);
    static final Duration OUTAGE_AFTER = Duration.ofHours(24);

    record SourceStatus(
            String slug,
            String name,
            String state,
            Instant lastAttemptAt,
            Instant lastSuccessAt,
            Instant newestItemAt,
            int consecutiveFailures,
            boolean circuitOpen) {
    }

    record Status(String state, Instant lastSuccessAt, List<SourceStatus> sources) {
    }

    private final StatusRepository repository;
    private final ComplianceConfig config;
    private final Clock clock;

    StatusController(StatusRepository repository, ComplianceConfig config, Clock clock) {
        this.repository = repository;
        this.config = config;
        this.clock = clock;
    }

    @GetMapping("/api/v1/status")
    ResponseEntity<Status> status() {
        Instant now = clock.instant();
        List<SourceStatus> sources = repository.enabledSources().stream()
                .map(r -> new SourceStatus(r.slug(), config.source(r.slug()).map(s -> s.name()).orElse(r.slug()),
                        state(r.lastSuccessAt(), now), r.lastAttemptAt(), r.lastSuccessAt(), r.newestItemAt(),
                        r.consecutiveFailures(), r.circuitOpenUntil() != null && now.isBefore(r.circuitOpenUntil())))
                .toList();
        boolean anyNeverRan = sources.isEmpty() || sources.stream().anyMatch(s -> s.lastSuccessAt() == null);
        Instant oldest = sources.stream().map(SourceStatus::lastSuccessAt).filter(Objects::nonNull)
                .min(Comparator.naturalOrder()).orElse(null);
        String overall = anyNeverRan && oldest == null ? "unknown" : state(anyNeverRan ? null : oldest, now);
        return ResponseEntity.ok()
                .cacheControl(CacheControl.maxAge(Duration.ofSeconds(30)).cachePublic())
                .body(new Status(overall, anyNeverRan ? null : oldest, sources));
    }

    static String state(Instant lastSuccess, Instant now) {
        if (lastSuccess == null) {
            return "unknown";
        }
        Duration age = Duration.between(lastSuccess, now);
        if (age.compareTo(STALE_AFTER) < 0) {
            return "fresh";
        }
        return age.compareTo(OUTAGE_AFTER) < 0 ? "stale" : "outage";
    }
}
