package io.github.yoavdory.eastwire.api.articles;

import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import java.util.stream.IntStream;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * {@code GET /api/v1/search/suggestions}: example searches that return results right now.
 * Each candidate is counted against the live stories, and only those with matches are
 * offered, most matches first, so a suggested search is never empty.
 */
@RestController
class SearchSuggestionsController {

    /** Places and topics a reader of Asian news might look for; country names are left to the filters. */
    static final List<String> CANDIDATES = List.of(
            "Delhi", "Mumbai", "Bengaluru", "Chennai", "Kolkata", "Hyderabad", "Tokyo", "Osaka", "Beijing", "Shanghai",
            "Shenzhen", "Hong Kong", "Seoul", "Busan", "Taiwan", "Pakistan", "Bangladesh",
            "rupee", "yen", "yuan", "inflation", "interest rates", "bank", "IPO", "stocks", "exports", "tariffs",
            "election", "court", "protest", "police", "monsoon", "flood", "heatwave", "climate", "pollution",
            "AI", "semiconductor", "startup", "smartphone", "electric vehicle", "space",
            "Tata", "Reliance", "Adani", "Infosys", "Samsung", "Hyundai", "Toyota", "Sony", "Alibaba", "BYD",
            "cricket", "Bollywood", "film", "festival", "students", "health", "women", "Uyghur", "Tibet");
    static final int MAX = 8;

    record Suggestion(String q, long count) {
    }

    private final JdbcClient jdbc;

    SearchSuggestionsController(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    @GetMapping("/api/v1/search/suggestions")
    ResponseEntity<List<Suggestion>> suggestions() {
        Map<String, Object> params = new LinkedHashMap<>();
        String values = IntStream.range(0, CANDIDATES.size())
                .peek(i -> params.put("q" + i, CANDIDATES.get(i)))
                .mapToObj(i -> "(CAST(:q" + i + " AS text))")
                .collect(Collectors.joining(", "));
        List<Suggestion> found = jdbc.sql("""
                        SELECT v.q, count(a.id) AS n
                        FROM (VALUES %s) AS v(q)
                        JOIN article a ON a.search_tsv @@ websearch_to_tsquery('english', v.q) AND a.expires_at > now()
                        GROUP BY v.q
                        ORDER BY n DESC, v.q
                        LIMIT %d
                        """.formatted(values, MAX))
                .params(params)
                .query((rs, n) -> new Suggestion(rs.getString("q"), rs.getLong("n")))
                .list();
        return ResponseEntity.ok().cacheControl(CacheControl.maxAge(Duration.ofMinutes(10)).cachePublic()).body(found);
    }
}
