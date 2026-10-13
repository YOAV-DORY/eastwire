package io.github.yoavdory.eastwire.ingest.gdelt;

import io.github.yoavdory.eastwire.core.article.Location;
import io.github.yoavdory.eastwire.core.article.Location.Confidence;
import io.github.yoavdory.eastwire.core.article.Location.Method;
import io.github.yoavdory.eastwire.core.article.Location.Precision;
import io.github.yoavdory.eastwire.core.article.Location.Role;
import io.github.yoavdory.eastwire.core.config.City;
import io.github.yoavdory.eastwire.core.config.ComplianceConfig;
import io.github.yoavdory.eastwire.core.config.Country;
import io.github.yoavdory.eastwire.core.geo.Geo;
import io.github.yoavdory.eastwire.ingest.gdelt.GkgRecord.GkgLocation;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.stream.Stream;

/**
 * Turns GDELT's geocoded mentions into EastWire locations (role MENTIONED; GDELT gives no
 * event or publisher location for an article).
 *
 * <ul>
 *   <li>Country codes are FIPS in GDELT (South Korea = KS) and mapped to ISO (KR). Places
 *       outside the covered countries are dropped.</li>
 *   <li>A world city is pinned to a city on the list only if it is close to it: within 25 km
 *       with a matching name, or within 10 km. GDELT's feature ids are GNS ids, not GeoNames
 *       ids, so they can't be joined directly.</li>
 *   <li>Anything else stays at country or state precision. Country-level mentions are never
 *       pinned to the capital.</li>
 *   <li>A national capital gets LOW confidence: GDELT's geocoder also maps "Beijing said..."
 *       (the government) to the city.</li>
 * </ul>
 */
final class GkgLocationMapper {

    static final double NAME_MATCH_RADIUS_KM = 25;
    static final double NEARBY_RADIUS_KM = 10;

    private final Map<String, Country> byFips;
    private final Map<String, List<City>> citiesByCountry;

    GkgLocationMapper(ComplianceConfig config) {
        this.byFips = config.activeCountries().stream().collect(Collectors.toMap(Country::fips, c -> c));
        this.citiesByCountry = config.cities().stream().collect(Collectors.groupingBy(City::countryIso2));
    }

    List<Location> map(List<GkgLocation> mentions) {
        Map<String, Location> unique = new LinkedHashMap<>();
        for (GkgLocation g : mentions) {
            Country country = byFips.get(g.fipsCountry());
            if (country == null) {
                continue;
            }
            Location location = switch (g.type()) {
                case WORLD_CITY -> matchCity(country.iso2(), g)
                        .map(city -> new Location(city.geonamesId(), country.iso2(), Role.MENTIONED, Precision.CITY,
                                city.isNationalCapital() ? Confidence.LOW : Confidence.MEDIUM, Method.GDELT_GKG,
                                "Mentions " + g.shortName()))
                        .orElse(new Location(null, country.iso2(), Role.MENTIONED, Precision.COUNTRY, Confidence.MEDIUM,
                                Method.GDELT_GKG, "Mentions " + g.shortName() + " (not on the city list)"));
                case WORLD_STATE -> new Location(null, country.iso2(), Role.MENTIONED, Precision.ADMIN1,
                        Confidence.MEDIUM, Method.GDELT_GKG, "Mentions " + g.shortName());
                case COUNTRY -> new Location(null, country.iso2(), Role.MENTIONED, Precision.COUNTRY,
                        Confidence.MEDIUM, Method.GDELT_GKG, "Mentions " + country.name());
                case US_STATE, US_CITY -> null;
            };
            if (location != null) {
                unique.putIfAbsent(key(location), location);
            }
        }
        return new ArrayList<>(unique.values());
    }

    Optional<City> matchCity(String iso2, GkgLocation g) {
        String name = Geo.fold(g.shortName());
        record Candidate(City city, double km, boolean nameMatches) {
        }
        return citiesByCountry.getOrDefault(iso2, List.of()).stream()
                .map(c -> new Candidate(c, Geo.distanceKm(g.lat(), g.lon(), c.lat(), c.lon()), names(c).contains(name)))
                .filter(c -> (c.nameMatches() && c.km() <= NAME_MATCH_RADIUS_KM) || c.km() <= NEARBY_RADIUS_KM)
                .min(Comparator.comparingDouble(Candidate::km))
                .map(Candidate::city);
    }

    private static Set<String> names(City c) {
        return Stream.concat(Stream.of(c.name(), c.asciiName()), c.aliasList().stream())
                .map(Geo::fold)
                .collect(Collectors.toSet());
    }

    private static String key(Location l) {
        return l.role() + "|" + l.precision() + "|" + l.countryIso2() + "|" + l.placeId();
    }
}
