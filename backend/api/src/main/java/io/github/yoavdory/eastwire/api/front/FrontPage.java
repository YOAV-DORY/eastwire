package io.github.yoavdory.eastwire.api.front;

import io.github.yoavdory.eastwire.api.articles.ArticleView;
import java.time.Instant;
import java.util.List;

/**
 * The front page (or a country, city or sector front): what is shown and the time windows it
 * covers, so every count on the page can say what it counts.
 *
 * @param latestWindowHours Latest holds news published (or, without a publication time, found)
 *                          in this many hours
 * @param latestCount       distinct events in that window, after one story per event
 * @param reading           features and news older than the Latest window, newest first
 * @param readingFrom       the oldest story time in {@code reading}, or null when empty
 */
public record FrontPage(
        Instant generatedAt,
        int latestWindowHours,
        Story lead,
        List<Story> secondary,
        List<ArticleView> latest,
        int latestCount,
        List<ArticleView> reading,
        int readingWindowDays,
        Instant readingFrom,
        Instant readingTo) {

    /** A lead or secondary story, with the reasons it was chosen and, if cleared, an illustrative image. */
    public record Story(ArticleView article, Image image, List<String> why) {
    }

    /**
     * A cleared illustrative image and everything needed to credit it.
     *
     * @param src         960px wide; {@code srcSet} offers 500, 960 and 1920
     * @param illustrative always true: these images show the place or topic, never the event
     */
    public record Image(
            String id,
            String src,
            String srcSet,
            int width,
            int height,
            String alt,
            String caption,
            String position,
            String creator,
            String attribution,
            String license,
            String licenseUrl,
            String filePage,
            boolean shareAlike,
            String changes,
            boolean illustrative) {
    }
}
