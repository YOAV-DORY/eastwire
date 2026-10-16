package io.github.yoavdory.eastwire.api.mix;

import io.github.yoavdory.eastwire.api.articles.ArticleQuery;
import io.github.yoavdory.eastwire.api.articles.ArticleRepository;
import io.github.yoavdory.eastwire.api.articles.ArticleRow;
import io.github.yoavdory.eastwire.api.articles.ArticleService;
import io.github.yoavdory.eastwire.api.articles.ArticleView;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Today's mix: how the stories of the last 24 hours split by the country they are about and
 * by publisher, for the Sources page. Counts only stories the display policy allows, the same
 * ones a reader can see, news and features alike.
 */
@RestController
class MixController {

    static final Duration WINDOW = Duration.ofHours(24);
    /** The repository's page size cap, read page by page up to this many stories. */
    static final int MAX_STORIES = 1000;

    record Share(String key, String label, long count) {
    }

    /** @param noCountry stories that name no covered country as their main subject */
    record Mix(int windowHours, long total, List<Share> countries, long noCountry, List<Share> publishers) {
    }

    private final ArticleRepository repository;
    private final ArticleService articles;
    private final Clock clock;

    MixController(ArticleRepository repository, ArticleService articles, Clock clock) {
        this.repository = repository;
        this.articles = articles;
        this.clock = clock;
    }

    @GetMapping("/api/v1/mix")
    ResponseEntity<Mix> mix() {
        Instant now = clock.instant();
        List<ArticleView> views = new ArrayList<>();
        for (int page = 1; page <= ArticleQuery.MAX_PAGE && views.size() < MAX_STORIES; page++) {
            List<ArticleRow> rows = repository.find(new ArticleQuery(null, null, now.minus(WINDOW), null, page, ArticleQuery.MAX_SIZE));
            rows.stream().map(r -> articles.toView(r, now)).filter(Objects::nonNull).forEach(views::add);
            if (rows.size() < ArticleQuery.MAX_SIZE) {
                break;
            }
        }
        Map<String, Long> byCountry = new LinkedHashMap<>();
        Map<String, Long> byPublisher = new LinkedHashMap<>();
        long noCountry = 0;
        for (ArticleView v : views) {
            String country = v.locations().stream()
                    .filter(l -> l.primary() && !"publisher".equals(l.role()))
                    .map(ArticleView.LocationView::country)
                    .findFirst().orElse(null);
            if (country == null) {
                noCountry++;
            } else {
                byCountry.merge(country, 1L, Long::sum);
            }
            byPublisher.merge(v.publisher(), 1L, Long::sum);
        }
        return ResponseEntity.ok()
                .cacheControl(CacheControl.maxAge(Duration.ofMinutes(5)).cachePublic())
                .body(new Mix((int) WINDOW.toHours(), views.size(), shares(byCountry), noCountry, shares(byPublisher)));
    }

    private static List<Share> shares(Map<String, Long> counts) {
        return counts.entrySet().stream()
                .sorted(Map.Entry.<String, Long>comparingByValue(Comparator.reverseOrder()).thenComparing(Map.Entry.comparingByKey()))
                .map(e -> new Share(e.getKey(), e.getKey(), e.getValue()))
                .toList();
    }
}
