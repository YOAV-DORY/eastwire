package io.github.yoavdory.eastwire.core.policy;

/**
 * An item that is about to be shown.
 *
 * @param sourceSlug     the source the item came through (e.g. {@code gdelt-gkg}, {@code global-voices})
 * @param url            the original article or post URL
 * @param author         byline, if the source provides one
 * @param credit         credit line such as "AFP-Jiji", used to spot wire-service copy
 * @param partnerReprint true if the item is a reprint from another outlet (Global Voices partners)
 */
public record DisplayRequest(String sourceSlug, String url, String author, String credit, boolean partnerReprint) {

    public static DisplayRequest of(String sourceSlug, String url) {
        return new DisplayRequest(sourceSlug, url, null, null, false);
    }
}
