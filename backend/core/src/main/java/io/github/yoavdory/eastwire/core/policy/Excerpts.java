package io.github.yoavdory.eastwire.core.policy;

import java.text.BreakIterator;
import java.util.Locale;

/** Shortens permitted text to an excerpt without cutting through a sentence when possible. */
public final class Excerpts {

    private static final String ELLIPSIS = "…";

    private Excerpts() {
    }

    /**
     * Returns at most {@code maxChars} characters of {@code text}: as many whole sentences as
     * fit, otherwise whole words plus an ellipsis. Returns null when nothing may or can be shown.
     */
    public static String truncate(String text, int maxChars) {
        if (text == null || maxChars <= 0) {
            return null;
        }
        String clean = text.replaceAll("\\s+", " ").strip();
        if (clean.isEmpty()) {
            return null;
        }
        if (clean.length() <= maxChars) {
            return clean;
        }

        BreakIterator sentences = BreakIterator.getSentenceInstance(Locale.ENGLISH);
        sentences.setText(clean);
        int end = 0;
        for (int next = sentences.next(); next != BreakIterator.DONE && next <= maxChars; next = sentences.next()) {
            end = next;
        }
        if (end > 0) {
            return clean.substring(0, end).strip();
        }

        int cut = clean.lastIndexOf(' ', maxChars - ELLIPSIS.length());
        if (cut <= 0) {
            cut = maxChars - ELLIPSIS.length();
        }
        return clean.substring(0, cut).strip() + ELLIPSIS;
    }
}
