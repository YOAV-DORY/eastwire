package io.github.yoavdory.eastwire.ingest.social;

import java.sql.Timestamp;
import java.time.Clock;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Connects social posts to stories EastWire already lists, for the "Related reporting" chip.
 * Two ways only, both mechanical: the post shares the article's URL, or the article's
 * headline appears almost word for word in the post. Never "verified": only "related".
 */
@Component
public class SocialLinker {

    /** pg_trgm word_similarity of the headline within the post text; 1.0 means it appears verbatim. */
    static final double HEADLINE_IN_POST = 0.6;

    public record Result(int sharedUrl, int textOverlap) {
    }

    private final JdbcClient jdbc;
    private final Clock clock;

    public SocialLinker(JdbcClient jdbc, Clock clock) {
        this.jdbc = jdbc;
        this.clock = clock;
    }

    @Transactional
    public Result link() {
        record Match(long itemId, long articleId, Long clusterId, double score) {
        }
        var shared = jdbc.sql("""
                        SELECT s.id AS item_id, a.id AS article_id, a.cluster_id, 1.0 AS score
                        FROM social_item s JOIN article a ON a.url_hash = s.linked_url_hash
                        WHERE s.status = 'active' AND a.expires_at > now()
                          AND NOT EXISTS (SELECT 1 FROM social_link l WHERE l.social_item_id = s.id)
                        """)
                .query((rs, n) -> new Match(rs.getLong("item_id"), rs.getLong("article_id"), (Long) rs.getObject("cluster_id"),
                        rs.getDouble("score")))
                .list();
        shared.forEach(m -> insert(m.itemId(), ensureCluster(m.articleId(), m.clusterId()), "shares_url", m.score()));

        var overlap = jdbc.sql("""
                        SELECT s.id AS item_id, m.id AS article_id, m.cluster_id, m.score
                        FROM social_item s
                        CROSS JOIN LATERAL (
                            SELECT a.id, a.cluster_id, word_similarity(a.title, s.index_text) AS score
                            FROM article a
                            WHERE a.expires_at > now()
                              AND COALESCE(a.published_at, a.discovered_at)
                                  BETWEEN s.created_at - interval '48 hours' AND s.created_at + interval '48 hours'
                              AND word_similarity(a.title, s.index_text) >= :threshold
                            ORDER BY score DESC, a.id
                            LIMIT 1) m
                        WHERE s.status = 'active' AND s.index_text IS NOT NULL
                          AND NOT EXISTS (SELECT 1 FROM social_link l WHERE l.social_item_id = s.id)
                        """)
                .param("threshold", HEADLINE_IN_POST)
                .query((rs, n) -> new Match(rs.getLong("item_id"), rs.getLong("article_id"), (Long) rs.getObject("cluster_id"),
                        rs.getDouble("score")))
                .list();
        overlap.forEach(m -> insert(m.itemId(), ensureCluster(m.articleId(), m.clusterId()), "text_overlap", m.score()));
        return new Result(shared.size(), overlap.size());
    }

    /** Links point at story clusters; a story reported once gets a cluster of one. */
    private long ensureCluster(long articleId, Long clusterId) {
        if (clusterId == null) {
            // Another post in this batch may already have created it.
            long current = jdbc.sql("SELECT COALESCE(cluster_id, 0) FROM article WHERE id = :a").param("a", articleId)
                    .query(Long.class).single();
            clusterId = current == 0 ? null : current;
        }
        if (clusterId != null) {
            return clusterId;
        }
        long id = jdbc.sql("""
                        INSERT INTO story_cluster (first_seen_at, representative_article_id, size)
                        VALUES (:now, :article, 1) RETURNING id
                        """)
                .param("now", Timestamp.from(clock.instant())).param("article", articleId)
                .query(Long.class).single();
        jdbc.sql("UPDATE article SET cluster_id = :c WHERE id = :a").param("c", id).param("a", articleId).update();
        return id;
    }

    private void insert(long itemId, long clusterId, String type, double score) {
        jdbc.sql("""
                        INSERT INTO social_link (social_item_id, cluster_id, link_type, score)
                        VALUES (:item, :cluster, :type, :score) ON CONFLICT DO NOTHING
                        """)
                .param("item", itemId).param("cluster", clusterId).param("type", type)
                .param("score", Math.round(score * 1000) / 1000.0)
                .update();
    }
}
