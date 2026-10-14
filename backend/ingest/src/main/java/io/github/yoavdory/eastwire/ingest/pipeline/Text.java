package io.github.yoavdory.eastwire.ingest.pipeline;

import org.jsoup.Jsoup;
import org.jsoup.parser.Parser;

/**
 * Turns feed or GDELT text into plain text. EastWire never renders HTML from a source:
 * tags are dropped and entities decoded here, and the frontend escapes whatever is left.
 */
public final class Text {

    public static final int MAX_TITLE_CHARS = 300;

    private Text() {
    }

    /** Plain text from HTML or text with entities, whitespace collapsed; null if nothing remains. */
    public static String plain(String htmlOrText) {
        if (htmlOrText == null) {
            return null;
        }
        String text = Jsoup.parse(htmlOrText).text().replaceAll("\\s+", " ").strip();
        return text.isEmpty() ? null : text;
    }

    /** A headline: entities decoded ("caf&#xE9;" → "café"), tags dropped, length capped. */
    public static String title(String raw) {
        if (raw == null) {
            return null;
        }
        String text = plain(Parser.unescapeEntities(raw, false));
        if (text == null) {
            return null;
        }
        return text.length() <= MAX_TITLE_CHARS ? text : text.substring(0, MAX_TITLE_CHARS - 1).strip() + "…";
    }
}
