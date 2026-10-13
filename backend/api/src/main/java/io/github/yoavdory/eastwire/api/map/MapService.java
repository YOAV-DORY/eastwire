package io.github.yoavdory.eastwire.api.map;

import io.github.yoavdory.eastwire.api.map.MapRepository.LocationRow;
import io.github.yoavdory.eastwire.core.config.City;
import io.github.yoavdory.eastwire.core.config.ComplianceConfig;
import io.github.yoavdory.eastwire.core.policy.DisplayPolicy;
import io.github.yoavdory.eastwire.core.policy.DisplayRequest;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;

/**
 * City pins and country-level counts for the map.
 *
 * <ul>
 *   <li>Only articles the display policy allows are counted, so the map always agrees with the
 *       story list.</li>
 *   <li>Only city-precision locations become pins. An article that only names a country is
 *       counted under "country level" and never pinned to the capital.</li>
 *   <li>An article counts once per city, whatever the number of roles it has there.</li>
 * </ul>
 */
@Service
public class MapService {

    public enum Window {
        DAY("24h", Duration.ofHours(24)),
        WEEK("7d", Duration.ofDays(7)),
        MONTH("30d", Duration.ofDays(30));

        final String label;
        final Duration length;

        Window(String label, Duration length) {
            this.label = label;
            this.length = length;
        }

        public String label() {
            return label;
        }
    }

    /**
     * @param lowConfidenceOnly every location placing stories here is low confidence (shown dashed)
     */
    public record CityPin(
            long id,
            String name,
            String country,
            double lat,
            double lon,
            int total,
            int mentioned,
            int event,
            int publisher,
            boolean lowConfidenceOnly,
            Instant lastItemAt) {
    }

    public record CountryOnly(String country, int count) {
    }

    public record MapData(String window, List<String> roles, List<CityPin> cities, List<CountryOnly> countryOnly) {
    }

    private final MapRepository repository;
    private final DisplayPolicy policy;
    private final Map<Long, City> cities;
    private final Clock clock;

    public MapService(MapRepository repository, DisplayPolicy policy, ComplianceConfig config, Clock clock) {
        this.repository = repository;
        this.policy = policy;
        this.cities = config.cities().stream().collect(Collectors.toMap(City::geonamesId, Function.identity()));
        this.clock = clock;
    }

    public MapData map(Window window, Set<String> roles, String country) {
        Instant since = clock.instant().minus(window.length);
        List<LocationRow> rows = repository.locations(since, country).stream()
                .filter(r -> roles.contains(r.role()))
                .toList();

        Map<Long, Boolean> visible = new HashMap<>();
        Map<Long, Pin> pins = new LinkedHashMap<>();
        Map<Long, Set<String>> citiedCountries = new HashMap<>();   // article -> countries it has a city in
        Map<Long, Set<String>> mentionedCountries = new HashMap<>();
        for (LocationRow r : rows) {
            boolean show = visible.computeIfAbsent(r.articleId(), id ->
                    policy.decide(new DisplayRequest(r.sourceSlug(), r.url(), r.author(), r.credit(), false)).visible());
            if (!show) {
                continue;
            }
            mentionedCountries.computeIfAbsent(r.articleId(), k -> new HashSet<>()).add(r.country());
            if ("city".equals(r.precision()) && r.placeId() != null && cities.containsKey(r.placeId())) {
                citiedCountries.computeIfAbsent(r.articleId(), k -> new HashSet<>()).add(r.country());
                pins.computeIfAbsent(r.placeId(), Pin::new).add(r);
            }
        }

        Map<String, Integer> countryOnly = new LinkedHashMap<>();
        mentionedCountries.forEach((article, countries) -> {
            Set<String> withCity = citiedCountries.getOrDefault(article, Set.of());
            for (String c : countries) {
                if (!withCity.contains(c)) {
                    countryOnly.merge(c, 1, Integer::sum);
                }
            }
        });

        List<CityPin> cityPins = pins.values().stream()
                .map(p -> p.toView(cities.get(p.placeId)))
                .sorted(Comparator.comparingInt(CityPin::total).reversed().thenComparing(CityPin::name))
                .toList();
        List<CountryOnly> countryOnlyList = countryOnly.entrySet().stream()
                .map(e -> new CountryOnly(e.getKey(), e.getValue()))
                .sorted(Comparator.comparing(CountryOnly::country))
                .toList();
        return new MapData(window.label(), roles.stream().sorted().toList(), cityPins, countryOnlyList);
    }

    /** Counts for one city; each article counted once overall and once per role. */
    private static final class Pin {
        final long placeId;
        final Set<Long> all = new HashSet<>();
        final Map<String, Set<Long>> byRole = new HashMap<>();
        boolean allLow = true;
        Instant last;

        Pin(long placeId) {
            this.placeId = placeId;
        }

        void add(LocationRow r) {
            all.add(r.articleId());
            byRole.computeIfAbsent(r.role(), k -> new HashSet<>()).add(r.articleId());
            allLow &= "low".equals(r.confidence());
            last = last == null || r.time().isAfter(last) ? r.time() : last;
        }

        CityPin toView(City c) {
            return new CityPin(c.geonamesId(), c.name(), c.countryIso2(), c.lat(), c.lon(), all.size(),
                    count("mentioned"), count("event"), count("publisher"), allLow, last);
        }

        private int count(String role) {
            return byRole.getOrDefault(role, Set.of()).size();
        }
    }
}
