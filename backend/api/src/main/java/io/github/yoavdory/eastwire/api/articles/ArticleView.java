package io.github.yoavdory.eastwire.api.articles;

import java.time.Instant;
import java.util.List;

/**
 * One story card, as the frontend receives it. Built only from what the display policy allows.
 *
 * @param viaDiscovery   true when found through GDELT (shown as "via GDELT")
 * @param isNew          published in the last hour (discovered, if the source gives no time)
 * @param alsoReportedBy other stored articles in the same story cluster
 * @param publishedAt    the publisher's own time, or null when the source gives none
 * @param discoveredAt   when the source first listed it (GDELT's crawl time, or the feed)
 * @param ingestedAt     when EastWire stored it
 * @param storyType      news, or feature (analysis, essays, citizen media: the reading section)
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
        List<SectorTag> sectors,
        int alsoReportedBy,
        Instant ingestedAt,
        String storyType) {

    public record Source(String slug, String name) {
    }

    public record License(String name, String url) {
    }

    /**
     * @param role       mentioned | event | publisher
     * @param precision  city | admin1 | country
     * @param confidence high | medium | low
     * @param placeName  city name for city precision, else null
     * @param primary    the story is about this place (headline, dateline, lead), not a passing mention
     */
    public record LocationView(
            String role,
            String precision,
            String confidence,
            String method,
            String country,
            Long placeId,
            String placeName,
            String evidence,
            boolean primary) {
    }

    /**
     * A sector tag and why it was given.
     *
     * @param rules every rule that contributed, e.g. keyword "inflation" in the headline (+3)
     */
    public record SectorTag(String slug, String label, double score, List<Rule> rules) {
    }

    /**
     * @param kind   keyword | negative | gdelt_theme | feed_category
     * @param field  headline | excerpt, for keywords
     * @param weight what it added to the score
     */
    public record Rule(String kind, String value, String field, double weight) {
    }

    /** One page of the feed. {@code total} counts all matching articles across pages. */
    public record Page(List<ArticleView> items, int page, int size, long total, boolean hasMore) {
    }
}
