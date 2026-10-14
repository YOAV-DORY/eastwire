package io.github.yoavdory.eastwire.api.articles;

import java.time.Instant;
import java.util.List;

/**
 * One story card, as the frontend receives it. Built only from what the display policy allows.
 *
 * @param viaDiscovery   true when found through GDELT (shown as "via GDELT")
 * @param isNew          discovered in the last hour
 * @param alsoReportedBy other stored articles in the same story cluster
 */
public record ArticleView(
        long id,
        String title,
        String url,
        String publisher,
        String domain,
        Source source,
        boolean viaDiscovery,
        Instant publishedAt,
        Instant discoveredAt,
        boolean isNew,
        String excerpt,
        String attribution,
        License license,
        List<LocationView> locations,
        List<String> sectors,
        int alsoReportedBy) {

    public record Source(String slug, String name) {
    }

    public record License(String name, String url) {
    }

    /**
     * @param role       mentioned | event | publisher
     * @param precision  city | admin1 | country
     * @param confidence high | medium | low
     * @param placeName  city name for city precision, else null
     */
    public record LocationView(
            String role,
            String precision,
            String confidence,
            String method,
            String country,
            Long placeId,
            String placeName,
            String evidence) {
    }

    /** One page of the feed. {@code total} counts all matching articles across pages. */
    public record Page(List<ArticleView> items, int page, int size, long total, boolean hasMore) {
    }
}
