package io.github.yoavdory.eastwire.api.social;

import java.sql.Array;
import java.sql.SQLException;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

/** Stored social posts and videos from enabled accounts, and the stories they are linked to. */
@Repository
public class SocialRepository {

    public record ItemRow(long id, String platform, String url, String externalId, String cid, String text, String title,
            String thumbnailUrl, Instant createdAt, List<String> countries, String handle, String name, String kind,
            String reason, String evidenceUrl) {
    }

    public record RelatedRow(long itemId, String linkType, long articleId, String title, String url, String sourceSlug,
            String author, String credit) {
    }

    private final JdbcClient jdbc;

    public SocialRepository(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    public List<ItemRow> find(List<String> platforms, String country, int limit, int offset) {
        Map<String, Object> params = new LinkedHashMap<>();
        String where = where(platforms, country, params);
        params.put("limit", limit);
        params.put("offset", offset);
        return jdbc.sql("""
                        SELECT i.id, i.platform, i.url, i.external_id, i.cid, i.index_text, i.title, i.thumbnail_url,
                               i.created_at, i.countries, a.handle, a.display_name, a.kind, a.reason, a.evidence_url
                        FROM social_item i JOIN social_account a ON a.id = i.account_id
                        """ + where + """
                        ORDER BY i.created_at DESC, i.id DESC
                        LIMIT :limit OFFSET :offset
                        """)
                .params(params)
                .query((rs, n) -> new ItemRow(rs.getLong("id"), rs.getString("platform"), rs.getString("url"),
                        rs.getString("external_id"), rs.getString("cid"), rs.getString("index_text"), rs.getString("title"),
                        rs.getString("thumbnail_url"), rs.getTimestamp("created_at").toInstant(), strings(rs.getArray("countries")),
                        rs.getString("handle"), rs.getString("display_name"), rs.getString("kind"), rs.getString("reason"),
                        rs.getString("evidence_url")))
                .list();
    }

    public long count(List<String> platforms, String country) {
        Map<String, Object> params = new LinkedHashMap<>();
        String where = where(platforms, country, params);
        return jdbc.sql("SELECT count(*) FROM social_item i JOIN social_account a ON a.id = i.account_id " + where)
                .params(params).query(Long.class).single();
    }

    /** Live stories in the clusters each item is linked to, newest first. */
    public List<RelatedRow> related(List<Long> itemIds) {
        if (itemIds.isEmpty()) {
            return List.of();
        }
        return jdbc.sql("""
                        SELECT l.social_item_id, l.link_type, ar.id, ar.title, ar.canonical_url, s.slug, ar.author, ar.credit_line
                        FROM social_link l
                        JOIN article ar ON ar.cluster_id = l.cluster_id
                        JOIN source s ON s.id = ar.source_id
                        WHERE l.social_item_id IN (:ids) AND ar.expires_at > now()
                        ORDER BY COALESCE(ar.published_at, ar.discovered_at) DESC, ar.id
                        """)
                .param("ids", itemIds)
                .query((rs, n) -> new RelatedRow(rs.getLong("social_item_id"), rs.getString("link_type"), rs.getLong("id"),
                        rs.getString("title"), rs.getString("canonical_url"), rs.getString("slug"), rs.getString("author"),
                        rs.getString("credit_line")))
                .list();
    }

    private static String where(List<String> platforms, String country, Map<String, Object> params) {
        List<String> conditions = new ArrayList<>(List.of("i.status = 'active'", "a.enabled", "i.expires_at > now()",
                "i.platform IN (:platforms)"));
        params.put("platforms", platforms);
        if (country != null) {
            conditions.add(":country = ANY(i.countries)");
            params.put("country", country);
        }
        return "WHERE " + String.join(" AND ", conditions) + "\n";
    }

    private static List<String> strings(Array array) throws SQLException {
        if (array == null) {
            return List.of();
        }
        return List.of((String[]) array.getArray());
    }
}
