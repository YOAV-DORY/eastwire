package io.github.yoavdory.eastwire.api.articles;

import io.github.yoavdory.eastwire.api.articles.ArticleRow.LocationRow;
import io.github.yoavdory.eastwire.api.articles.ArticleRow.SectorRow;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

/**
 * SQL for the article feed. Filters are added only when present, so every query is fully
 * parameterized and there are no untyped NULL parameters.
 */
@Repository
public class JdbcArticleRepository implements ArticleRepository {

    /**
     * Country and city filters match what the article is about: a main-subject place in the
     * text or dateline (article_location.is_primary), never a passing mention or the publisher's base.
     */
    private static final String ABOUT = "l.role IN ('mentioned', 'event') AND l.is_primary";

    private final JdbcClient jdbc;

    public JdbcArticleRepository(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    public List<ArticleRow> find(ArticleQuery q) {
        Map<String, Object> params = new LinkedHashMap<>();
        String sql = """
                SELECT a.id, s.slug AS source_slug, a.title, a.canonical_url, a.domain, a.excerpt, a.author,
                       a.credit_line, a.attribution, a.license_name, a.license_url, a.published_at, a.discovered_at,
                       COALESCE(c.size, 1) AS cluster_size, a.cluster_id, a.story_type, a.ingested_at,
                       to_jsonb(a) ->> 'summary' AS summary
                FROM article a
                JOIN source s ON s.id = a.source_id
                LEFT JOIN story_cluster c ON c.id = a.cluster_id
                """ + where(q, params) + orderBy(q) + """
                LIMIT :limit OFFSET :offset
                """;
        params.put("limit", q.size());
        params.put("offset", q.offset());
        List<ArticleRow> rows = jdbc.sql(sql).params(params).query(JdbcArticleRepository::row).list();
        return withDetails(rows);
    }

    @Override
    public long count(ArticleQuery q) {
        Map<String, Object> params = new LinkedHashMap<>();
        return jdbc.sql("SELECT count(*) FROM article a " + where(q, params)).params(params).query(Long.class).single();
    }

    /** Relevance uses ts_rank_cd (cover density), so phrases and words close together rank higher. */
    private static String orderBy(ArticleQuery q) {
        String newest = "COALESCE(a.published_at, a.discovered_at) DESC, a.id DESC";
        if (q.text() != null && q.sort() == ArticleQuery.Sort.RELEVANCE) {
            return "ORDER BY ts_rank_cd(a.search_tsv, websearch_to_tsquery('english', :q)) DESC, " + newest + "\n";
        }
        return "ORDER BY " + newest + "\n";
    }

    private static String where(ArticleQuery q, Map<String, Object> params) {
        List<String> conditions = new ArrayList<>();
        conditions.add("a.expires_at > now()");
        if (q.text() != null) {
            // websearch syntax: "exact phrase", -excluded, OR. It never raises on odd input.
            conditions.add("a.search_tsv @@ websearch_to_tsquery('english', :q)");
            params.put("q", q.text());
        }
        if (q.country() != null) {
            conditions.add("EXISTS (SELECT 1 FROM article_location l WHERE l.article_id = a.id "
                    + "AND l.country_iso2 = :country AND " + ABOUT + ")");
            params.put("country", q.country());
        }
        if (q.cityId() != null) {
            conditions.add("EXISTS (SELECT 1 FROM article_location l WHERE l.article_id = a.id "
                    + "AND l.place_id = :city AND " + ABOUT + ")");
            params.put("city", q.cityId());
        }
        if (q.sector() != null) {
            conditions.add("EXISTS (SELECT 1 FROM article_sector t WHERE t.article_id = a.id AND t.sector = :sector)");
            params.put("sector", q.sector());
        }
        if (q.storyType() != null) {
            conditions.add("a.story_type = :storyType");
            params.put("storyType", q.storyType());
        }
        if (q.from() != null) {
            conditions.add("COALESCE(a.published_at, a.discovered_at) >= :from");
            params.put("from", Timestamp.from(q.from()));
        }
        if (q.to() != null) {
            conditions.add("COALESCE(a.published_at, a.discovered_at) < :to");
            params.put("to", Timestamp.from(q.to()));
        }
        return "WHERE " + String.join(" AND ", conditions) + "\n";
    }

    private List<ArticleRow> withDetails(List<ArticleRow> rows) {
        if (rows.isEmpty()) {
            return rows;
        }
        List<Long> ids = rows.stream().map(ArticleRow::id).toList();
        Map<Long, List<LocationRow>> locations = new LinkedHashMap<>();
        jdbc.sql("""
                        SELECT l.article_id, l.role, l.precision, l.confidence, l.method, l.country_iso2, l.place_id,
                               p.name AS place_name, l.evidence_snippet, COALESCE(l.is_primary, false) AS is_primary
                        FROM article_location l LEFT JOIN place p ON p.geonames_id = l.place_id
                        WHERE l.article_id IN (:ids)
                        ORDER BY l.id
                        """)
                .param("ids", ids)
                .query((rs, n) -> {
                    locations.computeIfAbsent(rs.getLong("article_id"), k -> new ArrayList<>()).add(new LocationRow(
                            rs.getString("role"), rs.getString("precision"), rs.getString("confidence"),
                            rs.getString("method"), rs.getString("country_iso2"), (Long) rs.getObject("place_id"),
                            rs.getString("place_name"), rs.getString("evidence_snippet"), rs.getBoolean("is_primary")));
                    return null;
                })
                .list();
        Map<Long, List<SectorRow>> sectors = new LinkedHashMap<>();
        jdbc.sql("""
                        SELECT article_id, sector, score, matched_rules::text AS rules
                        FROM article_sector WHERE article_id IN (:ids) ORDER BY score DESC, sector
                        """)
                .param("ids", ids)
                .query((rs, n) -> {
                    sectors.computeIfAbsent(rs.getLong("article_id"), k -> new ArrayList<>())
                            .add(new SectorRow(rs.getString("sector"), rs.getDouble("score"), rs.getString("rules")));
                    return null;
                })
                .list();
        return rows.stream()
                .map(r -> r.withDetails(locations.getOrDefault(r.id(), List.of()), sectors.getOrDefault(r.id(), List.of())))
                .toList();
    }

    private static ArticleRow row(ResultSet rs, int n) throws SQLException {
        return new ArticleRow(rs.getLong("id"), rs.getString("source_slug"), rs.getString("title"),
                rs.getString("canonical_url"), rs.getString("domain"), rs.getString("excerpt"), rs.getString("author"),
                rs.getString("credit_line"), rs.getString("attribution"), rs.getString("license_name"),
                rs.getString("license_url"), instant(rs.getTimestamp("published_at")),
                instant(rs.getTimestamp("discovered_at")), rs.getInt("cluster_size"), List.of(), List.of(),
                (Long) rs.getObject("cluster_id"), rs.getString("story_type"), instant(rs.getTimestamp("ingested_at")),
                rs.getString("summary"));
    }

    private static Instant instant(Timestamp ts) {
        return ts == null ? null : ts.toInstant();
    }
}
