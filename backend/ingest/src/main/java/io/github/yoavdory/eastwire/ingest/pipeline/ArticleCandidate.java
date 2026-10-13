package io.github.yoavdory.eastwire.ingest.pipeline;

import io.github.yoavdory.eastwire.core.article.Location;
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
        List<Location> locations) {

    public ArticleCandidate {
        locations = List.copyOf(locations);
    }

    /** The time the article's age is measured from. */
    public Instant referenceTime() {
        return publishedAt != null ? publishedAt : discoveredAt;
    }

    public enum ExcerptKind {
        /** The publisher's own summary line (e.g. an RSS dek) under its excerpt policy. */
        PUBLISHER_DEK,
        /** Text under a Creative Commons license (Global Voices). */
        CC_BY_EXCERPT,
        NONE
    }
}
