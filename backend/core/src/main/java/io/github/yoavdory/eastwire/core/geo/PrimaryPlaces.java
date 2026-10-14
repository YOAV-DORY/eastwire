package io.github.yoavdory.eastwire.core.geo;

import io.github.yoavdory.eastwire.core.article.Location;
import io.github.yoavdory.eastwire.core.article.Location.Method;
import io.github.yoavdory.eastwire.core.article.Location.Precision;
import io.github.yoavdory.eastwire.core.article.Location.Role;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 * Decides which of a story's places it is <em>about</em>, so a country or city page shows
 * stories about that place and not ones that only mention it in passing (an Indian shoe
 * company's results naming a Japanese supplier is not Japan news).
 *
 * <p>A place is the main subject when any of these holds:
 * <ul>
 *   <li>the headline names it (the city, or for a country: its name, demonym or one of its cities);</li>
 *   <li>it is the story's dateline;</li>
 *   <li>it is the first covered place the full text mentions (GDELT gives each mention's
 *       position; the caller passes locations in text order and says so);</li>
 *   <li>the publisher filed the story under exactly one covered country (Global Voices tags).</li>
 * </ul>
 * Where the publisher is based never makes a place the subject.
 */
public final class PrimaryPlaces {

    private PrimaryPlaces() {
    }

    /**
     * @param inTextOrder true when {@code locations} are ordered by first mention in the full
     *                    text, so the first non-publisher one is the story's lead place
     */
    public static List<Location> mark(String headline, List<Location> locations, Gazetteer gazetteer, boolean inTextOrder) {
        Set<Long> headlineCities = new HashSet<>();
        Set<String> headlineCountries = new HashSet<>();
        for (Gazetteer.Match m : gazetteer.find(headline == null ? "" : headline)) {
            headlineCities.add(m.city().geonamesId());
            headlineCountries.add(m.city().countryIso2());
        }
        Set<String> filed = new HashSet<>();
        for (Location l : locations) {
            if (l.method() == Method.FEED_CATEGORY) {
                filed.add(l.countryIso2());
            }
        }
        Location lead = inTextOrder
                ? locations.stream().filter(l -> l.role() != Role.PUBLISHER).findFirst().orElse(null)
                : null;

        return locations.stream().map(l -> l.withPrimary(isPrimary(l, headline, gazetteer, headlineCities,
                headlineCountries, filed, lead))).toList();
    }

    private static boolean isPrimary(Location l, String headline, Gazetteer gazetteer, Set<Long> headlineCities,
            Set<String> headlineCountries, Set<String> filed, Location lead) {
        if (l.role() == Role.PUBLISHER) {
            return false;
        }
        if (l.role() == Role.EVENT) {
            return true;
        }
        if (l.precision() == Precision.CITY) {
            return headlineCities.contains(l.placeId()) || l.equals(lead);
        }
        // Country- or state-level: about that country.
        return headlineCountries.contains(l.countryIso2())
                || gazetteer.mentionsCountry(l.countryIso2(), headline)
                || (lead != null && lead.countryIso2().equals(l.countryIso2()))
                || (l.method() == Method.FEED_CATEGORY && filed.size() == 1);
    }
}
