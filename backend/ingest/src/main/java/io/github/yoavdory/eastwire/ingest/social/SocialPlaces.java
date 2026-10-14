package io.github.yoavdory.eastwire.ingest.social;

import io.github.yoavdory.eastwire.core.config.ComplianceConfig;
import io.github.yoavdory.eastwire.core.config.Country;
import io.github.yoavdory.eastwire.core.geo.Gazetteer;
import java.util.List;
import java.util.TreeSet;
import org.springframework.stereotype.Component;

/**
 * Which covered countries a post's own words name: a country name or demonym ("Japan",
 * "Japanese") or a city on the list. Never the account's base, its language or its followers.
 */
@Component
public class SocialPlaces {

    private final List<Country> countries;
    private final Gazetteer gazetteer;

    public SocialPlaces(ComplianceConfig config, Gazetteer gazetteer) {
        this.countries = config.activeCountries();
        this.gazetteer = gazetteer;
    }

    public List<String> countriesNamedIn(String text) {
        if (text == null || text.isBlank()) {
            return List.of();
        }
        TreeSet<String> found = new TreeSet<>();
        for (Country c : countries) {
            if (gazetteer.mentionsCountry(c.iso2(), text)) {
                found.add(c.iso2());
            }
        }
        // A capital used as shorthand for its government ("Tokyo said...") still names the
        // country. Ambiguous city names only match when the country is named too (Gazetteer).
        gazetteer.find(text).forEach(m -> found.add(m.city().countryIso2()));
        return List.copyOf(found);
    }
}
