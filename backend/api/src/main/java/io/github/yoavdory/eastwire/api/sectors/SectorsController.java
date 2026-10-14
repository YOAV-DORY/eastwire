package io.github.yoavdory.eastwire.api.sectors;

import io.github.yoavdory.eastwire.core.sector.SectorRules;
import java.time.Duration;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * {@code GET /api/v1/sectors}: the six sectors, every rule that tags them (straight from
 * config/sectors.yaml) and how many live stories carry each tag. Powers "How we tag this".
 */
@RestController
class SectorsController {

    record Rule(String rule, double weight) {
    }

    record SectorView(String slug, String label, String definition, long last7d, List<Rule> keywords, List<Rule> negative,
            List<Rule> gdeltThemes, List<Rule> feedCategories) {
    }

    /**
     * @param untagged7d stories from the last 7 days with no sector ("Unclassified")
     */
    record SectorsView(String version, double threshold, int maxSectors, double excerptFactor, double themeCap,
            long untagged7d, List<SectorView> sectors) {
    }

    private final SectorRules rules;
    private final JdbcClient jdbc;

    SectorsController(SectorRules rules, JdbcClient jdbc) {
        this.rules = rules;
        this.jdbc = jdbc;
    }

    @GetMapping("/api/v1/sectors")
    ResponseEntity<SectorsView> sectors() {
        Map<String, Long> counts = new HashMap<>();
        jdbc.sql("""
                        SELECT t.sector, count(*) AS n
                        FROM article_sector t JOIN article a ON a.id = t.article_id
                        WHERE a.expires_at > now() AND COALESCE(a.published_at, a.discovered_at) > now() - interval '7 days'
                        GROUP BY t.sector
                        """)
                .query((rs, n) -> counts.put(rs.getString("sector"), rs.getLong("n")))
                .list();
        long untagged = jdbc.sql("""
                        SELECT count(*) FROM article a
                        WHERE a.expires_at > now() AND COALESCE(a.published_at, a.discovered_at) > now() - interval '7 days'
                          AND NOT EXISTS (SELECT 1 FROM article_sector t WHERE t.article_id = a.id)
                        """)
                .query(Long.class).single();
        List<SectorView> sectors = rules.sectors().stream()
                .map(s -> new SectorView(s.slug(), s.label(), s.definition(), counts.getOrDefault(s.slug(), 0L),
                        list(s.keywords()), list(s.negative()), list(s.gdeltThemes()), list(s.feedCategories())))
                .toList();
        return ResponseEntity.ok()
                .cacheControl(CacheControl.maxAge(Duration.ofMinutes(5)).cachePublic())
                .body(new SectorsView(rules.version(), rules.threshold(), rules.maxSectors(), rules.excerptFactor(),
                        rules.themeCap(), untagged, sectors));
    }

    /** Highest weight first, then the order of sectors.yaml. */
    private static List<Rule> list(Map<String, Double> rules) {
        return rules.entrySet().stream()
                .map(e -> new Rule(e.getKey(), e.getValue()))
                .sorted((a, b) -> Double.compare(b.weight(), a.weight()))
                .toList();
    }
}
