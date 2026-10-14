package io.github.yoavdory.eastwire.ingest.run;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Component;
import tools.jackson.databind.json.JsonMapper;

/**
 * Writes {@code ingestion_run} (one row per attempt) and {@code source_status} (one row per
 * source: last attempt, last success, cursor, failures, circuit). The site's freshness labels
 * are read from {@code source_status}.
 */
@Component
public class RunRecorder {

    /** What the runner needs to know about a source before running it. */
    public record SourceState(short sourceId, String cursor, int consecutiveFailures, Instant circuitOpenUntil) {
    }

    private static final JsonMapper JSON = JsonMapper.builder().build();

    private final JdbcClient jdbc;

    public RunRecorder(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    public Optional<Short> sourceId(String slug) {
        return jdbc.sql("SELECT id FROM source WHERE slug = :slug").param("slug", slug).query(Short.class).optional();
    }

    public SourceState state(short sourceId) {
        return jdbc.sql("""
                        SELECT cursor, consecutive_failures, circuit_open_until
                        FROM source_status WHERE source_id = :id
                        """)
                .param("id", sourceId)
                .query((rs, n) -> new SourceState(sourceId, rs.getString("cursor"), rs.getInt("consecutive_failures"),
                        toInstant(rs.getTimestamp("circuit_open_until"))))
                .optional()
                .orElse(new SourceState(sourceId, null, 0, null));
    }

    public long start(short sourceId, String cursorBefore, Instant now) {
        return jdbc.sql("""
                        INSERT INTO ingestion_run (source_id, started_at, status, cursor_before)
                        VALUES (:id, :now, 'running', :cursor) RETURNING id
                        """)
                .param("id", sourceId).param("now", Timestamp.from(now)).param("cursor", cursorBefore)
                .query(Long.class).single();
    }

    public void finish(long runId, SourceState before, RunOutcome outcome, Instant now) {
        jdbc.sql("""
                        UPDATE ingestion_run SET finished_at = :now, status = :status, items_seen = :seen,
                            items_new = :new, http_status = :http, error_class = :errorClass,
                            error_message = :errorMessage, cursor_after = :cursorAfter, details = CAST(:details AS jsonb)
                        WHERE id = :runId
                        """)
                .param("now", Timestamp.from(now)).param("status", db(outcome.status()))
                .param("seen", outcome.itemsSeen()).param("new", outcome.itemsNew())
                .param("http", outcome.httpStatus()).param("errorClass", outcome.errorClass())
                .param("errorMessage", outcome.errorMessage()).param("cursorAfter", outcome.cursorAfter())
                .param("details", JSON.writeValueAsString(outcome.details())).param("runId", runId)
                .update();
        updateStatus(before, outcome, now);
    }

    /** Records a run that was not attempted (e.g. circuit open), without touching failure counts. */
    public void skipped(short sourceId, String reason, Instant now) {
        jdbc.sql("""
                        INSERT INTO ingestion_run (source_id, started_at, finished_at, status, details)
                        VALUES (:id, :now, :now, 'skipped', CAST(:details AS jsonb))
                        """)
                .param("id", sourceId).param("now", Timestamp.from(now))
                .param("details", JSON.writeValueAsString(Map.of("reason", reason)))
                .update();
    }

    private void updateStatus(SourceState before, RunOutcome outcome, Instant now) {
        boolean ok = outcome.madeProgress();
        int failures = ok ? 0 : before.consecutiveFailures() + 1;
        Instant openUntil = ok ? null : CircuitBreaker.openUntilAfterFailure(failures, now);
        String cursor = outcome.cursorAfter() != null ? outcome.cursorAfter() : before.cursor();
        String error = ok ? null : outcome.errorClass() + ": " + outcome.errorMessage();
        jdbc.sql("""
                        INSERT INTO source_status (source_id, last_attempt_at, last_success_at, newest_item_at,
                                                   consecutive_failures, circuit_open_until, last_error, cursor)
                        VALUES (:id, :now, :success, :newest, :failures, :openUntil, :error, :cursor)
                        ON CONFLICT (source_id) DO UPDATE SET
                            last_attempt_at = EXCLUDED.last_attempt_at,
                            last_success_at = COALESCE(EXCLUDED.last_success_at, source_status.last_success_at),
                            newest_item_at = GREATEST(source_status.newest_item_at, EXCLUDED.newest_item_at),
                            consecutive_failures = EXCLUDED.consecutive_failures,
                            circuit_open_until = EXCLUDED.circuit_open_until,
                            last_error = EXCLUDED.last_error,
                            cursor = EXCLUDED.cursor
                        """)
                .param("id", before.sourceId()).param("now", Timestamp.from(now))
                .param("success", ok ? Timestamp.from(now) : null)
                .param("newest", outcome.newestItemAt() == null ? null : Timestamp.from(outcome.newestItemAt()))
                .param("failures", failures)
                .param("openUntil", openUntil == null ? null : Timestamp.from(openUntil))
                .param("error", error).param("cursor", cursor)
                .update();
    }

    private static String db(RunOutcome.Status status) {
        return status.name().toLowerCase(Locale.ROOT);
    }

    private static Instant toInstant(Timestamp ts) {
        return ts == null ? null : ts.toInstant();
    }
}
