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
        List<SectorRow> sectors,
        Long clusterId,
        String storyType,
        Instant ingestedAt,
        String summary) {

    /** A row without EastWire's own summary (tests and older call sites). */
    public ArticleRow(long id, String sourceSlug, String title, String url, String domain, String excerpt, String author,
            String creditLine, String attribution, String licenseName, String licenseUrl, Instant publishedAt,
            Instant discoveredAt, int clusterSize, List<LocationRow> locations, List<SectorRow> sectors, Long clusterId,
            String storyType, Instant ingestedAt) {
        this(id, sourceSlug, title, url, domain, excerpt, author, creditLine, attribution, licenseName, licenseUrl,
                publishedAt, discoveredAt, clusterSize, locations, sectors, clusterId, storyType, ingestedAt, null);
    }

    /** A news row without cluster or ingestion details (tests and older call sites). */
    public ArticleRow(long id, String sourceSlug, String title, String url, String domain, String excerpt, String author,
            String creditLine, String attribution, String licenseName, String licenseUrl, Instant publishedAt,
            Instant discoveredAt, int clusterSize, List<LocationRow> locations, List<SectorRow> sectors) {
        this(id, sourceSlug, title, url, domain, excerpt, author, creditLine, attribution, licenseName, licenseUrl,
                publishedAt, discoveredAt, clusterSize, locations, sectors, null, "news", discoveredAt);
    }

    /** The time the story's age is measured from: its publication, else when it was found. */
    public Instant referenceTime() {
        return publishedAt != null ? publishedAt : discoveredAt;
    }

    /** A stored location, with the city name joined in for city-precision rows. */
    public record LocationRow(
            String role,
            String precision,
            String confidence,
            String method,
            String countryIso2,
            Long placeId,
            String placeName,
            String evidence,
            boolean primary) {
    }

    /** A stored sector tag; {@code rulesJson} is the matched_rules array as written by ingestion. */
    public record SectorRow(String sector, double score, String rulesJson) {
    }

    public ArticleRow withDetails(List<LocationRow> newLocations, List<SectorRow> newSectors) {
        return new ArticleRow(id, sourceSlug, title, url, domain, excerpt, author, creditLine, attribution, licenseName,
                licenseUrl, publishedAt, discoveredAt, clusterSize, newLocations, newSectors, clusterId, storyType, ingestedAt,
                summary);
    }
}
