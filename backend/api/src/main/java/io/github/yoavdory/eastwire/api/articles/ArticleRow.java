package io.github.yoavdory.eastwire.api.articles;

import java.time.Instant;
import java.util.List;

/** An article as stored, before the read-time display check. */
public record ArticleRow(
        long id,
        String sourceSlug,
        String title,
        String url,
        String domain,
        String excerpt,
        String author,
        String creditLine,
        String attribution,
        String licenseName,
        String licenseUrl,
        Instant publishedAt,
        Instant discoveredAt,
        int clusterSize,
        List<LocationRow> locations,
        List<String> sectors) {

    /** A stored location, with the city name joined in for city-precision rows. */
    public record LocationRow(
            String role,
            String precision,
            String confidence,
            String method,
            String countryIso2,
            Long placeId,
            String placeName,
            String evidence) {
    }

    public ArticleRow withDetails(List<LocationRow> newLocations, List<String> newSectors) {
        return new ArticleRow(id, sourceSlug, title, url, domain, excerpt, author, creditLine, attribution, licenseName,
                licenseUrl, publishedAt, discoveredAt, clusterSize, newLocations, newSectors);
    }
}
