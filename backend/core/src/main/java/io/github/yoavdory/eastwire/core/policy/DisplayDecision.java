package io.github.yoavdory.eastwire.core.policy;

/**
 * What a card may show for one item. Every API response goes through {@link DisplayPolicy}.
 *
 * @param visible         false means the item must not be shown at all
 * @param reason          why it is hidden (or "ok"); for logs and tests, never shown to readers
 * @param excerptMaxChars 0 means headline and link only
 * @param showImage       always false in the MVP: no source has image rights
 * @param publisherName   name shown on the card
 * @param attribution     attribution line that must appear next to the item
 * @param label           extra fixed label, e.g. "Social post · not verified reporting"
 */
public record DisplayDecision(
        boolean visible,
        String reason,
        int excerptMaxChars,
        boolean showImage,
        String publisherName,
        String attribution,
        String label) {

    public static DisplayDecision hidden(String reason) {
        return new DisplayDecision(false, reason, 0, false, null, null, null);
    }

    public boolean showsExcerpt() {
        return visible && excerptMaxChars > 0;
    }
}
