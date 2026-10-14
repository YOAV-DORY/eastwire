package io.github.yoavdory.eastwire.ingest.gdelt;

import io.github.yoavdory.eastwire.ingest.gdelt.GkgRecord.GkgLocation;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.TreeSet;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Parses GDELT GKG 2.1 rows: 27 tab-separated columns per the GKG codebook.
 * Only web articles (collection id 1) with a URL are returned.
 */
final class GkgParser {

    static final int COLUMNS = 27;
    private static final int DATE = 1;
    private static final int COLLECTION = 2;
    private static final int SOURCE_NAME = 3;
    private static final int DOCUMENT_ID = 4;
    private static final int V1_THEMES = 7;
    private static final int V2_LOCATIONS = 10;
    private static final int EXTRAS = 26;

    static final DateTimeFormatter GDELT_TIME = DateTimeFormatter.ofPattern("yyyyMMddHHmmss");
    private static final Pattern TITLE = Pattern.compile("<PAGE_TITLE>(.*?)</PAGE_TITLE>", Pattern.DOTALL);
    private static final Pattern PUB_TIME = Pattern.compile("<PAGE_PRECISEPUBTIMESTAMP>(\\d{14})</PAGE_PRECISEPUBTIMESTAMP>");

    private GkgParser() {
    }

    /** Empty for rows that are not web articles; throws {@link IllegalArgumentException} for malformed rows. */
    static Optional<GkgRecord> parse(String line) {
        String[] cols = line.split("\t", -1);
        if (cols.length != COLUMNS) {
            throw new IllegalArgumentException("Expected " + COLUMNS + " columns, got " + cols.length);
        }
        if (!"1".equals(cols[COLLECTION]) || cols[DOCUMENT_ID].isBlank()) {
            return Optional.empty();
        }
        Matcher title = TITLE.matcher(cols[EXTRAS]);
        Matcher pub = PUB_TIME.matcher(cols[EXTRAS]);
        return Optional.of(new GkgRecord(
                parseTime(cols[DATE]),
                cols[SOURCE_NAME],
                cols[DOCUMENT_ID].strip(),
                title.find() ? title.group(1) : null,
                pub.find() ? parseTimeOrNull(pub.group(1)) : null,
                parseLocations(cols[V2_LOCATIONS]),
                parseThemes(cols[V1_THEMES])));
    }

    /** V1THEMES: theme codes separated by ';'. */
    static Set<String> parseThemes(String field) {
        Set<String> themes = new TreeSet<>();
        for (String t : field.split(";")) {
            if (!t.isBlank()) {
                themes.add(t.strip());
            }
        }
        return themes;
    }

    /** V2ENHANCEDLOCATIONS: "type#name#fips#adm1#adm2#lat#lon#featureId#offset" separated by ';'. */
    static List<GkgLocation> parseLocations(String field) {
        List<GkgLocation> out = new ArrayList<>();
        if (field == null || field.isBlank()) {
            return out;
        }
        for (String entry : field.split(";")) {
            String[] p = entry.split("#", -1);
            if (p.length < 8 || p[0].isBlank() || p[5].isBlank() || p[6].isBlank()) {
                continue;
            }
            try {
                out.add(new GkgLocation(GkgRecord.Type.of(Integer.parseInt(p[0])), p[1], p[2], p[3],
                        Double.parseDouble(p[5]), Double.parseDouble(p[6]), p[7]));
            } catch (IllegalArgumentException e) {
                // One odd location entry should not cost us the whole article.
            }
        }
        return out;
    }

    static Instant parseTime(String value) {
        return LocalDateTime.parse(value, GDELT_TIME).toInstant(ZoneOffset.UTC);
    }

    private static Instant parseTimeOrNull(String value) {
        try {
            return parseTime(value);
        } catch (DateTimeParseException e) {
            return null;
        }
    }
}
