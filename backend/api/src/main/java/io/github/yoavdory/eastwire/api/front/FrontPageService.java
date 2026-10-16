package io.github.yoavdory.eastwire.api.front;

import io.github.yoavdory.eastwire.api.articles.ArticleQuery;
import io.github.yoavdory.eastwire.api.articles.ArticleRepository;
import io.github.yoavdory.eastwire.api.articles.ArticleRow;
import io.github.yoavdory.eastwire.api.articles.ArticleService;
import io.github.yoavdory.eastwire.api.articles.ArticleView;
import io.github.yoavdory.eastwire.core.config.ImageCatalog;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import org.springframework.stereotype.Service;

/**
 * Builds a front page: news of the last 48 hours ranked by {@link FrontRanker}, and a dated
 * reading section of features and older reports. Every story passes the display policy again
 * here (via {@link ArticleService#toView}), so a story hidden by policy never becomes a lead.
 */
@Service
public class FrontPageService {

    static final int LATEST_CANDIDATES = 200;
    static final int LATEST_SHOWN = 18;
    static final int READING_SHOWN = 8;
    static final Duration READING_WINDOW = Duration.ofDays(30);

    private final ArticleRepository repository;
    private final ArticleService articles;
    private final ImageMatcher images;
    private final Clock clock;

    public FrontPageService(ArticleRepository repository, ArticleService articles, ImageCatalog catalog, Clock clock) {
        this.repository = repository;
        this.articles = articles;
        this.images = new ImageMatcher(catalog);
        this.clock = clock;
    }

    public FrontPage front(String country, Long city, String sector) {
        Instant now = clock.instant();
        Instant latestFrom = now.minus(FrontRanker.LATEST_WINDOW);

        // Latest: news only, in the window, and only rows the display policy still allows.
        List<ArticleRow> news = visible(repository.find(new ArticleQuery(country, city, latestFrom, null, 1,
                LATEST_CANDIDATES, null, ArticleQuery.Sort.DATE, sector, "news")), now);
        Map<Long, String> publishers = new HashMap<>();
        Map<Long, ArticleView> views = new HashMap<>();
        for (ArticleRow r : news) {
            ArticleView v = articles.toView(r, now);
            views.put(r.id(), v);
            publishers.put(r.id(), v.publisher());
        }
        // The unfiltered front page does not lead with the same country twice in a row: the lead
        // it would have chosen an hour ago (from the stories it had then) sets the country to avoid.
        String previousLeadCountry = null;
        if (country == null && city == null && sector == null) {
            Instant hourAgo = now.minus(Duration.ofHours(1));
            List<ArticleRow> earlier = news.stream().filter(r -> !r.referenceTime().isAfter(hourAgo)).toList();
            FrontRanker.Selection previous = FrontRanker.select(earlier, publishers, hourAgo);
            previousLeadCountry = previous.lead() == null ? null : previous.lead().country();
        }
        FrontRanker.Selection selection = FrontRanker.select(news, publishers, now, previousLeadCountry);

        Set<String> used = new HashSet<>();
        FrontPage.Story lead = selection.lead() == null ? null : story(selection.lead(), views, used);
        List<FrontPage.Story> secondary = selection.secondary().stream().map(s -> story(s, views, used)).toList();
        List<ArticleView> latest = selection.rest().stream().limit(LATEST_SHOWN).map(s -> views.get(s.row().id())).toList();

        // Reading: features of the last 30 days, and news older than the Latest window.
        Instant readingFrom = now.minus(READING_WINDOW);
        List<ArticleRow> reading = new ArrayList<>();
        reading.addAll(repository.find(new ArticleQuery(country, city, readingFrom, null, 1, 40, null,
                ArticleQuery.Sort.DATE, sector, "feature")));
        reading.addAll(repository.find(new ArticleQuery(country, city, readingFrom, latestFrom, 1, 40, null,
                ArticleQuery.Sort.DATE, sector, "news")));
        List<ArticleView> newestFirst = reading.stream()
                .sorted(Comparator.comparing(ArticleRow::referenceTime).reversed())
                .map(r -> articles.toView(r, now))
                .filter(Objects::nonNull)
                .toList();
        // Chosen one publisher at a time, then shown newest first.
        List<ArticleView> readingViews = rotatePublishers(newestFirst).stream().limit(READING_SHOWN)
                .sorted(Comparator.comparing(FrontPageService::time).reversed())
                .toList();
        Instant oldest = readingViews.stream().map(FrontPageService::time).min(Comparator.naturalOrder()).orElse(null);
        Instant newest = readingViews.stream().map(FrontPageService::time).max(Comparator.naturalOrder()).orElse(null);

        return new FrontPage(now, (int) FrontRanker.LATEST_WINDOW.toHours(), lead, secondary, latest, selection.events(),
                readingViews, (int) READING_WINDOW.toDays(), oldest, newest);
    }

    /** Newest first, but one publisher at a time, so one prolific feed does not fill the section. */
    static List<ArticleView> rotatePublishers(List<ArticleView> newestFirst) {
        Map<String, java.util.ArrayDeque<ArticleView>> byPublisher = new java.util.LinkedHashMap<>();
        for (ArticleView v : newestFirst) {
            byPublisher.computeIfAbsent(v.publisher(), k -> new java.util.ArrayDeque<>()).add(v);
        }
        List<ArticleView> out = new ArrayList<>();
        while (!byPublisher.isEmpty()) {
            for (var queue : List.copyOf(byPublisher.values())) {
                out.add(queue.pollFirst());
            }
            byPublisher.values().removeIf(java.util.ArrayDeque::isEmpty);
        }
        return out;
    }

    private List<ArticleRow> visible(List<ArticleRow> rows, Instant now) {
        return rows.stream().filter(r -> articles.toView(r, now) != null).toList();
    }

    private FrontPage.Story story(FrontRanker.Scored s, Map<Long, ArticleView> views, Set<String> used) {
        FrontPage.Image image = images.match(s.row(), used)
                .map(i -> {
                    used.add(i.id());
                    return ImageMatcher.view(i);
                })
                .orElse(null);
        return new FrontPage.Story(views.get(s.row().id()), image, s.why());
    }

    private static Instant time(ArticleView v) {
        return v.publishedAt() != null ? v.publishedAt() : v.discoveredAt();
    }
}
