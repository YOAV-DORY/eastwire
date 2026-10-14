package io.github.yoavdory.eastwire.ingest.pipeline;

import io.github.yoavdory.eastwire.core.article.Location;
import io.github.yoavdory.eastwire.core.article.Location.Confidence;
import io.github.yoavdory.eastwire.core.article.Location.Method;
import io.github.yoavdory.eastwire.core.article.Location.Precision;
import io.github.yoavdory.eastwire.core.article.Location.Role;
import io.github.yoavdory.eastwire.core.config.QualityRules;
import io.github.yoavdory.eastwire.core.geo.Gazetteer;
import io.github.yoavdory.eastwire.core.geo.PrimaryPlaces;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Keeps stored stories consistent with rules that changed after they were written:
 * removes items config/quality.yaml now calls "not news", and decides the main-subject
 * places of stories stored before that flag existed (from the headline and stored places;
 * the GDELT text order is not kept, so that rule cannot apply to them).
 */
@Component
public class StoryHygiene {

    public record Result(int notNewsRemoved, int articlesJudged) {
    }

    private final JdbcClient jdbc;
    private final QualityRules quality;
    private final Gazetteer gazetteer;

    public StoryHygiene(JdbcClient jdbc, QualityRules quality, Gazetteer gazetteer) {
        this.jdbc = jdbc;
        this.quality = quality;
        this.gazetteer = gazetteer;
    }

    @Transactional
    public Result run() {
        record Stored(long id, String url, String title) {
        }
        List<Stored> stored = jdbc.sql("SELECT id, canonical_url, title FROM article")
                .query((rs, n) -> new Stored(rs.getLong("id"), rs.getString("canonical_url"), rs.getString("title")))
                .list();
        int removed = 0;
        for (Stored a : stored) {
            if (quality.notNewsReason(a.url(), a.title()) != null) {
                removed += jdbc.sql("DELETE FROM article WHERE id = :id").param("id", a.id()).update();
            }
        }
        return new Result(removed, judgeUnflagged());
    }

    private int judgeUnflagged() {
        record Row(long locationId, long articleId, String title, Location location) {
        }
        List<Row> rows = jdbc.sql("""
                        SELECT l.id, l.article_id, a.title, l.place_id, l.country_iso2, l.role, l.precision, l.confidence,
                               l.method, l.evidence_snippet
                        FROM article_location l JOIN article a ON a.id = l.article_id
                        WHERE l.article_id IN (SELECT article_id FROM article_location WHERE is_primary IS NULL)
                        ORDER BY l.article_id, l.id
                        """)
                .query((rs, n) -> new Row(rs.getLong("id"), rs.getLong("article_id"), rs.getString("title"),
                        new Location((Long) rs.getObject("place_id"), rs.getString("country_iso2"),
                                Role.valueOf(upper(rs.getString("role"))), Precision.valueOf(upper(rs.getString("precision"))),
                                Confidence.valueOf(upper(rs.getString("confidence"))), Method.valueOf(upper(rs.getString("method"))),
                                rs.getString("evidence_snippet"))))
                .list();
        Map<Long, List<Row>> byArticle = new LinkedHashMap<>();
        rows.forEach(r -> byArticle.computeIfAbsent(r.articleId(), k -> new ArrayList<>()).add(r));
        byArticle.forEach((articleId, list) -> {
            List<Location> marked = PrimaryPlaces.mark(list.getFirst().title(), list.stream().map(Row::location).toList(),
                    gazetteer, false);
            for (int i = 0; i < list.size(); i++) {
                jdbc.sql("UPDATE article_location SET is_primary = :p WHERE id = :id")
                        .param("p", marked.get(i).primary()).param("id", list.get(i).locationId()).update();
            }
        });
        return byArticle.size();
    }

    private static String upper(String s) {
        return s.toUpperCase(Locale.ROOT);
    }
}
