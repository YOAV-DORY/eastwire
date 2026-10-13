package io.github.yoavdory.eastwire.ingest.gdelt;

import java.time.Instant;
import java.util.List;

/**
 * The parts of one GDELT GKG 2.1 row that EastWire uses.
 *
 * @param date        when GDELT processed the article (V2.1DATE)
 * @param publishedAt publication time if GDELT extracted one (PAGE_PRECISEPUBTIMESTAMP), else null
 * @param title       raw PAGE_TITLE (may contain HTML entities)
 */
record GkgRecord(Instant date, String sourceName, String url, String title, Instant publishedAt, List<GkgLocation> locations) {

    /** One V2ENHANCEDLOCATIONS entry. GDELT's own geocoding of a place the text mentions. */
    record GkgLocation(Type type, String fullName, String fipsCountry, String adm1, double lat, double lon, String featureId) {

        /** The part before the first comma: "New Delhi" of "New Delhi, Delhi, India". */
        String shortName() {
            int comma = fullName.indexOf(',');
            return (comma < 0 ? fullName : fullName.substring(0, comma)).strip();
        }
    }

    /** GKG location types (GDELT GKG codebook): 1 country, 2 US state, 3 US city, 4 world city, 5 world state. */
    enum Type {
        COUNTRY, US_STATE, US_CITY, WORLD_CITY, WORLD_STATE;

        static Type of(int code) {
            return switch (code) {
                case 1 -> COUNTRY;
                case 2 -> US_STATE;
                case 3 -> US_CITY;
                case 4 -> WORLD_CITY;
                case 5 -> WORLD_STATE;
                default -> throw new IllegalArgumentException("Unknown GKG location type " + code);
            };
        }
    }
}
