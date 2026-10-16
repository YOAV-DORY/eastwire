package io.github.yoavdory.eastwire.core.policy;

/**
 * What a card may show for one item. Every API response goes through {@link DisplayPolicy}.
 *
 * @param visible         false means the item must not be shown at all
 * @param reason          why it is hidden (or "ok"); for logs and tests, never shown to readers
 * @param excerptMaxChars 0 means headline and link only
 * @param showImage       always false in the MVP: no source has image rights
 * @param publisherName   name shown on the card
 * @param attribution     credit that must appear next to the item, e.g. "By A. Writer, Global Voices"
 * @param licenseName     the content license that applies to this item, or null (e.g. partner reprints)
 * @param licenseUrl      link to that license, or null
 * @param excerptNote     added to the credit when an excerpt is shown, e.g. "excerpt, shortened"
 * @param label           extra fixed label, e.g. "Social post · not verified reporting"
 * @param publisherLabel  who runs the publisher, when readers should know: "Chinese state media",
 *                        "South Korean government" (from config, with a cited basis)
 */
public record DisplayDecision(
        boolean visible,
        String reason,
        int excerptMaxChars,
        boolean showImage,
        String publisherName,
        String attribution,
        String licenseName,
        String licenseUrl,
        String excerptNote,
        String label,
        String publisherLabel) {

    public static DisplayDecision hidden(String reason) {
        return new DisplayDecision(false, reason, 0, false, null, null, null, null, null, null, null);
    }

    /**
     * The full credit line, accurate for what is actually shown: the license only when it
     * applies, and the excerpt note only when an excerpt is displayed.
     */
    public String attributionLine(boolean excerptShown) {
        if (attribution == null) {
            return null;
        }
        StringBuilder line = new StringBuilder(attribution);
        if (licenseName != null) {
            line.append(" · ").append(licenseName);
        }
        if (excerptShown && excerptNote != null) {
            line.append(" · ").append(excerptNote);
        }
        return line.toString();
    }

    public boolean showsExcerpt() {
        return visible && excerptMaxChars > 0;
    }
}
