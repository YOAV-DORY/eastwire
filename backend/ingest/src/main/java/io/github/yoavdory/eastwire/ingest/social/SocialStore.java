package io.github.yoavdory.eastwire.ingest.social;

import io.github.yoavdory.eastwire.core.article.UrlCanonicalizer;
import io.github.yoavdory.eastwire.core.social.SocialAccount.Platform;
import java.sql.Timestamp;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Component;
import tools.jackson.databind.json.JsonMapper;

/**
 * Stores social posts and videos. Platform data lives at most 30 days after its last check
 * (YouTube Developer Policies III.E.4.c; the same rule is used for Bluesky), and anything the
 * platform removed or labelled is deleted, not hidden.
 */
@Component
public class SocialStore {

    public static final Duration RETENTION = Duration.ofDays(30);
    private static final JsonMapper JSON = JsonMapper.builder().build();

    private final JdbcClient jdbc;

    public SocialStore(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    /** Database id of each enabled account on a platform, by platform id (DID or channel id). */
    public Map<String, Long> accountIds(Platform platform) {
        return jdbc.sql("SELECT external_id, id FROM social_account WHERE platform = :p AND enabled")
                .param("p", platform.db())
                .query((rs, n) -> Map.entry(rs.getString("external_id"), rs.getLong("id")))
                .list().stream()
                .collect(Collectors.toMap(Map.Entry::getKey, Map.Entry::getValue));
    }

    /** Inserts or refreshes one item. Returns true if it was new, false if refreshed or taken down. */
    public boolean save(SocialItem item, long accountId, Instant now) {
        if (isSuppressed(item.platform(), item.externalId())) {
            delete(item.platform(), item.externalId());
            return false;
        }
        byte[] linkedHash = null;
        String linked = null;
        if (item.linkedUrl() != null) {
            try {
                linked = UrlCanonicalizer.canonicalUrl(item.linkedUrl());
                linkedHash = UrlCanonicalizer.hash(item.linkedUrl());
            } catch (IllegalArgumentException e) {
                linked = null;
            }
        }
        // Expires 30 days after publication; re-checks in between keep it only while it is still up.
        Instant expires = item.createdAt().plus(RETENTION);
        Boolean inserted = jdbc.sql("""
                        INSERT INTO social_item (platform, external_id, url, account_id, created_at, fetched_at,
                                                 last_verified_at, index_text, labels, status, expires_at, cid, title,
                                                 thumbnail_url, linked_url, linked_url_hash, countries)
                        VALUES (:platform, :externalId, :url, :accountId, :createdAt, :now, :now, :text,
                                CAST(:labels AS jsonb), 'active', :expires, :cid, :title, :thumb, :linked, :linkedHash,
                                CAST(:countries AS text[]))
                        ON CONFLICT (platform, external_id) DO UPDATE SET
                            last_verified_at = EXCLUDED.last_verified_at, index_text = EXCLUDED.index_text,
                            labels = EXCLUDED.labels, cid = EXCLUDED.cid, title = EXCLUDED.title,
                            thumbnail_url = EXCLUDED.thumbnail_url, linked_url = EXCLUDED.linked_url,
                            linked_url_hash = EXCLUDED.linked_url_hash, countries = EXCLUDED.countries
                        RETURNING (xmax = 0) AS inserted
                        """)
                .param("platform", item.platform().db())
                .param("externalId", item.externalId())
                .param("url", item.url())
                .param("accountId", accountId)
                .param("createdAt", Timestamp.from(item.createdAt()))
                .param("now", Timestamp.from(now))
                .param("text", item.text())
                .param("labels", JSON.writeValueAsString(item.labels()))
                .param("expires", Timestamp.from(expires))
                .param("cid", item.cid())
                .param("title", item.title())
                .param("thumb", item.thumbnailUrl())
                .param("linked", linked)
                .param("linkedHash", linkedHash)
                .param("countries", "{" + String.join(",", item.countries()) + "}")
                .query(Boolean.class)
                .single();
        return Boolean.TRUE.equals(inserted);
    }

    /** Active items on a platform last checked before {@code before}, oldest check first. */
    public List<String> toRevalidate(Platform platform, Instant before) {
        return jdbc.sql("""
                        SELECT external_id FROM social_item
                        WHERE platform = :p AND status = 'active' AND last_verified_at < :before
                        ORDER BY last_verified_at
                        """)
                .param("p", platform.db())
                .param("before", Timestamp.from(before))
                .query(String.class)
                .list();
    }

    public void markVerified(Platform platform, String externalId, Instant now) {
        jdbc.sql("UPDATE social_item SET last_verified_at = :now WHERE platform = :p AND external_id = :id")
                .param("now", Timestamp.from(now)).param("p", platform.db()).param("id", externalId)
                .update();
    }

    /** Removes an item the platform deleted, made private or labelled. Returns rows deleted. */
    public int delete(Platform platform, String externalId) {
        return jdbc.sql("DELETE FROM social_item WHERE platform = :p AND external_id = :id")
                .param("p", platform.db()).param("id", externalId)
                .update();
    }

    private boolean isSuppressed(Platform platform, String externalId) {
        return jdbc.sql("SELECT EXISTS (SELECT 1 FROM suppression WHERE platform = :p AND external_id = :id)")
                .param("p", platform.db()).param("id", externalId)
                .query(Boolean.class).single();
    }
}
