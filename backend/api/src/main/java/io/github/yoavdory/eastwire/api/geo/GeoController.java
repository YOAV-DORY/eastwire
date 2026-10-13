package io.github.yoavdory.eastwire.api.geo;

import io.github.yoavdory.eastwire.api.BadRequestException;
import io.github.yoavdory.eastwire.core.config.City;
import io.github.yoavdory.eastwire.core.config.ComplianceConfig;
import java.time.Duration;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** Covered countries (with story counts) and the documented city list. */
@RestController
class GeoController {

    record CountryView(String iso2, String name, long last24h, long total) {
    }

    record PlaceView(long id, String name, String country, String admin1, double lat, double lon, long population,
            boolean capital) {
    }

    private final ComplianceConfig config;
    private final JdbcClient jdbc;

    GeoController(ComplianceConfig config, JdbcClient jdbc) {
        this.config = config;
        this.jdbc = jdbc;
    }

    @GetMapping("/api/v1/countries")
    ResponseEntity<List<CountryView>> countries() {
        record Counts(long last24h, long total) {
        }
        Map<String, Counts> counts = new java.util.HashMap<>();
        jdbc.sql("""
                        SELECT l.country_iso2,
                               count(DISTINCT a.id) FILTER (WHERE COALESCE(a.published_at, a.discovered_at)
                                                                  > now() - interval '24 hours') AS last24h,
                               count(DISTINCT a.id) AS total
                        FROM article_location l JOIN article a ON a.id = l.article_id
                        WHERE l.role IN ('mentioned', 'event') AND a.expires_at > now()
                        GROUP BY l.country_iso2
                        """)
                .query((rs, n) -> counts.put(rs.getString("country_iso2"), new Counts(rs.getLong("last24h"), rs.getLong("total"))))
                .list();
        List<CountryView> views = config.activeCountries().stream()
                .map(c -> {
                    Counts n = counts.getOrDefault(c.iso2(), new Counts(0, 0));
                    return new CountryView(c.iso2(), c.name(), n.last24h(), n.total());
                })
                .sorted(Comparator.comparing(CountryView::name))
                .toList();
        return ResponseEntity.ok().cacheControl(CacheControl.maxAge(Duration.ofSeconds(60)).cachePublic()).body(views);
    }

    @GetMapping("/api/v1/places")
    ResponseEntity<List<PlaceView>> places(@RequestParam(required = false) String country) {
        if (country != null && config.activeCountries().stream().noneMatch(c -> c.iso2().equals(country))) {
            throw new BadRequestException("Unknown country '" + country + "'");
        }
        List<PlaceView> places = config.cities().stream()
                .filter(c -> country == null || c.countryIso2().equals(country))
                .sorted(Comparator.comparing(City::countryIso2).thenComparing(City::population, Comparator.reverseOrder()))
                .map(c -> new PlaceView(c.geonamesId(), c.name(), c.countryIso2(), c.admin1Name(), c.lat(), c.lon(),
                        c.population(), c.isNationalCapital()))
                .toList();
        return ResponseEntity.ok().cacheControl(CacheControl.maxAge(Duration.ofHours(24)).cachePublic()).body(places);
    }
}
