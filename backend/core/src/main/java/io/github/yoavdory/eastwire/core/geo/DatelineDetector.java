package io.github.yoavdory.eastwire.core.geo;

import io.github.yoavdory.eastwire.core.config.City;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Reads a news dateline at the start of a permitted text, e.g. {@code "SEOUL (Yonhap) — ..."},
 * {@code "NEW DELHI: ..."} or {@code "TOKYO, Japan - ..."}. A dateline is the only basis EastWire
 * uses for an article's EVENT location; without one the event location stays unknown.
 */
public final class DatelineDetector {

    private static final Pattern DATELINE = Pattern.compile(
            "^\\s*([A-Z][A-Z'’.\\- ]{1,28}[A-Z])"     // city in capitals
                    + "(?:,\\s*[A-Z][A-Za-z .]{1,30})?"   // optional ", Country"
                    + "\\s*(?:\\([^)]{1,40}\\))?"         // optional "(Agency)"
                    + "\\s*(?:[—–:]|-{1,2})\\s");          // dash or colon

    private final Gazetteer gazetteer;

    public DatelineDetector(Gazetteer gazetteer) {
        this.gazetteer = gazetteer;
    }

    public Optional<City> detect(String text) {
        if (text == null) {
            return Optional.empty();
        }
        Matcher m = DATELINE.matcher(text);
        if (!m.find()) {
            return Optional.empty();
        }
        return gazetteer.lookup(m.group(1).strip());
    }
}
