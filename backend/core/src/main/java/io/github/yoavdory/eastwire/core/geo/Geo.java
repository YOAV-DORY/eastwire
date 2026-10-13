package io.github.yoavdory.eastwire.core.geo;

import java.text.Normalizer;
import java.util.Locale;

/** Small geographic and name-normalization helpers. */
public final class Geo {

    private static final double EARTH_RADIUS_KM = 6371.0088;

    private Geo() {
    }

    /** Great-circle distance in kilometres. */
    public static double distanceKm(double lat1, double lon1, double lat2, double lon2) {
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(a));
    }

    /** "Ōita" → "oita", "Xi’an" → "xian": for comparing place names across spellings. */
    public static String fold(String name) {
        String noMarks = Normalizer.normalize(name, Normalizer.Form.NFD).replaceAll("\\p{M}+", "");
        return noMarks.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]+", "");
    }
}
