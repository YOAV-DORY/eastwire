package io.github.yoavdory.eastwire.api.articles;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.Deque;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Orders the front page so no single country fills it. Stories from the last 30 days are
 * dealt round-robin by the country they are about (their main-subject place), newest first
 * within each country and within each round; older stories follow by date. Only the
 * order changes: every story stays, and each card keeps its own date.
 */
final class FeedBalancer {

    /** Long enough to include the few Korea and Japan stories our sources carry; each card shows its own date. */
    static final Duration WINDOW = Duration.ofDays(30);
    /** Stories without a main-subject country (e.g. filed under several) share one group. */
    static final String NO_COUNTRY = "";

    private FeedBalancer() {
    }

    static List<ArticleRow> balance(List<ArticleRow> newestFirst, Instant now) {
        Instant since = now.minus(WINDOW);
        Map<String, Deque<ArticleRow>> groups = new LinkedHashMap<>();
        List<ArticleRow> older = new ArrayList<>();
        for (ArticleRow r : newestFirst) {
            if (time(r).isBefore(since)) {
                older.add(r);
            } else {
                groups.computeIfAbsent(country(r), k -> new ArrayDeque<>()).add(r);
            }
        }
        List<ArticleRow> out = new ArrayList<>(newestFirst.size());
        while (!groups.isEmpty()) {
            List<Deque<ArticleRow>> round = groups.values().stream()
                    .sorted(Comparator.comparing((Deque<ArticleRow> d) -> time(d.peekFirst())).reversed())
                    .toList();
            for (Deque<ArticleRow> group : round) {
                out.add(group.pollFirst());
            }
            groups.values().removeIf(Deque::isEmpty);
        }
        out.addAll(older);
        return out;
    }

    /** The first main-subject country of the story (text or dateline, never the publisher's base). */
    static String country(ArticleRow r) {
        return r.locations().stream()
                .filter(l -> l.primary() && !"publisher".equals(l.role()))
                .map(ArticleRow.LocationRow::countryIso2)
                .findFirst()
                .orElse(NO_COUNTRY);
    }

    private static Instant time(ArticleRow r) {
        return r.publishedAt() != null ? r.publishedAt() : r.discoveredAt();
    }
}
