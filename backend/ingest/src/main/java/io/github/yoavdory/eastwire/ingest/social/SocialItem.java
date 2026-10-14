package io.github.yoavdory.eastwire.ingest.social;

import io.github.yoavdory.eastwire.core.social.SocialAccount.Platform;
import java.time.Instant;
import java.util.List;

/**
 * A post or video ready to store.
 *
 * @param externalId the at:// URI of a Bluesky post, or a YouTube video id
 * @param text       Bluesky post text (search index and the plain-text fallback the official embed also shows)
 * @param title      YouTube video title
 * @param linkedUrl  the link the post shares, if any, for "related reporting"
 * @param countries  covered countries the text names (ISO codes)
 */
public record SocialItem(
        Platform platform,
        String externalId,
        String url,
        String accountId,
        Instant createdAt,
        String text,
        String cid,
        String title,
        String thumbnailUrl,
        String linkedUrl,
        List<String> labels,
        List<String> countries) {

    public SocialItem {
        labels = labels == null ? List.of() : List.copyOf(labels);
        countries = countries == null ? List.of() : List.copyOf(countries);
    }
}
