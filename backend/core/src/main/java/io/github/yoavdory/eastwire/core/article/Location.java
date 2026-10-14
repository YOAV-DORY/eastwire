package io.github.yoavdory.eastwire.core.article;

import java.util.Locale;

/**
 * A place attached to an article. The three roles are kept strictly apart (plan section 8):
 * a place the text mentions, where the event happened (only from an explicit dateline), and
 * where the publisher is based (only from the source registry, never from the content).
 *
 * @param placeId  GeoNames id of a city on the city list; null unless precision is CITY
 * @param evidence short text showing why (e.g. the matched name); at most 80 characters
 * @param primary  the place is what the story is about, not a passing mention ({@code PrimaryPlaces})
 */
public record Location(
        Long placeId,
        String countryIso2,
        Role role,
        Precision precision,
        Confidence confidence,
        Method method,
        String evidence,
        boolean primary) {

    /** A location not yet judged main subject or passing mention. */
    public Location(Long placeId, String countryIso2, Role role, Precision precision, Confidence confidence, Method method,
            String evidence) {
        this(placeId, countryIso2, role, precision, confidence, method, evidence, false);
    }

    public Location {
        if ((precision == Precision.CITY) != (placeId != null)) {
            throw new IllegalArgumentException("Only city-precision locations carry a place id");
        }
        if (evidence != null && evidence.length() > 80) {
            evidence = evidence.substring(0, 79) + "…";
        }
    }

    public Location withPrimary(boolean value) {
        return new Location(placeId, countryIso2, role, precision, confidence, method, evidence, value);
    }

    public enum Role { MENTIONED, EVENT, PUBLISHER }

    public enum Precision { CITY, ADMIN1, COUNTRY }

    public enum Confidence { HIGH, MEDIUM, LOW }

    public enum Method { GDELT_GKG, DATELINE, GAZETTEER, SOURCE_REGISTRY, FEED_CATEGORY }

    /** Lower-case enum name, as stored in the database. */
    public static String db(Enum<?> value) {
        return value.name().toLowerCase(Locale.ROOT);
    }
}
