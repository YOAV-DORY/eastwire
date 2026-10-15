package io.github.yoavdory.eastwire.ingest.pipeline;

import io.github.yoavdory.eastwire.core.article.Location;
import io.github.yoavdory.eastwire.core.sector.SectorSignals;
import java.time.Instant;
import java.util.List;

/**
 * An item a connector found, before the display policy and deduplication decide its fate.
 *
 * @param summary      permitted text an excerpt may be cut from (null if none); never shown
 *                     unless the display policy allows an excerpt for this source
 * @param excerptKind  the permission basis of an excerpt from {@code summary}
 * @param publishedAt  publication time if the source states it, else null
 * @param discoveredAt when the source made it visible to us (e.g. GDELT's processing time)
 * @param signals      topic hints from the source (GDELT themes, feed categories) for sector tagging
 * @param storyType    news, or a feature that belongs in the reading section rather than Latest
 */
public record ArticleCandidate(
        String sourceSlug,
        String url,
        String title,
        String summary,
        String author,
        String credit,
        boolean partnerReprint,
        ExcerptKind excerptKind,
        Instant publishedAt,
        Instant discoveredAt,
        String language,
        List<Location> locations,
        SectorSignals signals,
        StoryType storyType) {

    public ArticleCandidate {
        locations = List.copyOf(locations);
        signals = signals == null ? SectorSignals.NONE : signals;
        storyType = storyType == null ? StoryType.NEWS : storyType;
    }

    /** A news item (the default for discovery sources). */
    public ArticleCandidate(String sourceSlug, String url, String title, String summary, String author, String credit,
            boolean partnerReprint, ExcerptKind excerptKind, Instant publishedAt, Instant discoveredAt, String language,
            List<Location> locations, SectorSignals signals) {
        this(sourceSlug, url, title, summary, author, credit, partnerReprint, excerptKind, publishedAt, discoveredAt,
                language, locations, signals, StoryType.NEWS);
    }

    /** The time the article's age is measured from. */
    public Instant referenceTime() {
        return publishedAt != null ? publishedAt : discoveredAt;
    }

    public enum StoryType {
        /** Reporting on something that happened: eligible for Latest. */
        NEWS,
        /** Analysis, essays, explainers, citizen media: the dated reading section. */
        FEATURE
    }

    public enum ExcerptKind {
        /** The publisher's own summary line (e.g. an RSS dek) under its excerpt policy. */
        PUBLISHER_DEK,
        /** Text under a Creative Commons license (Global Voices). */
        CC_BY_EXCERPT,
        NONE
    }
}
