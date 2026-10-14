package io.github.yoavdory.eastwire.ingest.pipeline;

import java.sql.Timestamp;
import java.time.Clock;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Runs at the end of every ingestion run: removes articles past their source's retention
 * window, social items past 30 days, and anything taken down, then tidies the story clusters
 * they leave behind.
 */
@Component
public class RetentionPurger {

    /** @param socialExpired social posts and videos past their 30-day window or taken down */
    public record Result(int expired, int suppressed, int socialExpired) {
    }

    private final JdbcClient jdbc;
    private final Clock clock;

    public RetentionPurger(JdbcClient jdbc, Clock clock) {
        this.jdbc = jdbc;
        this.clock = clock;
    }

    @Transactional
    public Result purge() {
        int expired = jdbc.sql("DELETE FROM article WHERE expires_at <= :now")
                .param("now", Timestamp.from(clock.instant())).update();
        int suppressed = jdbc.sql("""
                DELETE FROM article a USING suppression s
                WHERE s.url_hash IS NOT NULL AND a.url_hash = s.url_hash
                """).update();
        int social = jdbc.sql("DELETE FROM social_item WHERE expires_at <= :now")
                .param("now", Timestamp.from(clock.instant())).update();
        social += jdbc.sql("""
                DELETE FROM social_item i USING suppression s
                WHERE s.external_id IS NOT NULL AND i.platform = s.platform AND i.external_id = s.external_id
                """).update();
        jdbc.sql("DELETE FROM story_cluster c WHERE NOT EXISTS (SELECT 1 FROM article a WHERE a.cluster_id = c.id)").update();
        jdbc.sql("""
                UPDATE story_cluster c SET size = counts.n
                FROM (SELECT cluster_id, count(*) AS n FROM article WHERE cluster_id IS NOT NULL GROUP BY cluster_id) counts
                WHERE counts.cluster_id = c.id AND c.size <> counts.n
                """).update();
        return new Result(expired, suppressed, social);
    }
}
