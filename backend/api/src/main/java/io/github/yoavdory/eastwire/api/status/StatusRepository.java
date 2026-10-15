package io.github.yoavdory.eastwire.api.status;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

/** Reads {@code source_status}, written by the ingest job after every run. */
@Repository
public class StatusRepository {

    /**
     * One enabled source's latest state; times are null if it never ran.
     *
     * @param lastSuccessAt      the last successful check of the source (a check can find nothing new)
     * @param newestItemAt       the newest item time the ingest job recorded (published, else found)
     * @param newestPublishedAt  the newest publication date among its stored stories
     * @param lastStoredAt       when EastWire last stored a new story from it
     */
    public record SourceRow(
            String slug,
            Instant lastAttemptAt,
            Instant lastSuccessAt,
            Instant newestItemAt,
            int consecutiveFailures,
            Instant circuitOpenUntil,
            String lastError,
            Instant newestPublishedAt,
            Instant lastStoredAt) {
    }

    private final JdbcClient jdbc;

    public StatusRepository(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    public List<SourceRow> enabledSources() {
        return jdbc.sql("""
                        SELECT s.slug, ss.last_attempt_at, ss.last_success_at, ss.newest_item_at,
                               COALESCE(ss.consecutive_failures, 0) AS consecutive_failures,
                               ss.circuit_open_until, ss.last_error,
                               (SELECT max(a.published_at) FROM article a
                                WHERE a.source_id = s.id AND a.expires_at > now()) AS newest_published_at,
                               (SELECT max(a.ingested_at) FROM article a WHERE a.source_id = s.id) AS last_stored_at
                        FROM source s LEFT JOIN source_status ss ON ss.source_id = s.id
                        WHERE s.enabled
                        ORDER BY s.slug
                        """)
                .query((rs, n) -> new SourceRow(rs.getString("slug"), instant(rs.getTimestamp("last_attempt_at")),
                        instant(rs.getTimestamp("last_success_at")), instant(rs.getTimestamp("newest_item_at")),
                        rs.getInt("consecutive_failures"), instant(rs.getTimestamp("circuit_open_until")),
                        rs.getString("last_error"), instant(rs.getTimestamp("newest_published_at")),
                        instant(rs.getTimestamp("last_stored_at"))))
                .list();
    }

    /** Size of the whole database, as Neon counts it against the free tier. */
    public long databaseBytes() {
        return jdbc.sql("SELECT pg_database_size(current_database())").query(Long.class).single();
    }

    private static Instant instant(Timestamp ts) {
        return ts == null ? null : ts.toInstant();
    }
}
