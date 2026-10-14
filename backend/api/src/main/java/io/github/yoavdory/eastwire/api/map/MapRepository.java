package io.github.yoavdory.eastwire.api.map;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

/** Raw location rows for the map; aggregation and the display policy happen in {@link MapService}. */
@Repository
public class MapRepository {

    /** One location of one live article. */
    public record LocationRow(
            long articleId,
            String sourceSlug,
            String url,
            String author,
            String credit,
            Instant time,
            String role,
            String precision,
            String confidence,
            String country,
            Long placeId) {
    }

    private final JdbcClient jdbc;

    public MapRepository(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    public List<LocationRow> locations(Instant since, String country, String sector) {
        Map<String, Object> params = new LinkedHashMap<>();
        params.put("since", Timestamp.from(since));
        String filters = "";
        if (country != null) {
            filters += "AND l.country_iso2 = :country\n";
            params.put("country", country);
        }
        if (sector != null) {
            filters += "AND EXISTS (SELECT 1 FROM article_sector t WHERE t.article_id = a.id AND t.sector = :sector)\n";
            params.put("sector", sector);
        }
        return jdbc.sql("""
                        SELECT a.id, s.slug, a.canonical_url, a.author, a.credit_line,
                               COALESCE(a.published_at, a.discovered_at) AS t,
                               l.role, l.precision, l.confidence, l.country_iso2, l.place_id
                        FROM article a
                        JOIN source s ON s.id = a.source_id
                        JOIN article_location l ON l.article_id = a.id
                        WHERE a.expires_at > now() AND COALESCE(a.published_at, a.discovered_at) > :since
                        """ + filters)
                .params(params)
                .query((rs, n) -> new LocationRow(rs.getLong("id"), rs.getString("slug"), rs.getString("canonical_url"),
                        rs.getString("author"), rs.getString("credit_line"), rs.getTimestamp("t").toInstant(),
                        rs.getString("role"), rs.getString("precision"), rs.getString("confidence"),
                        rs.getString("country_iso2"), (Long) rs.getObject("place_id")))
                .list();
    }
}
