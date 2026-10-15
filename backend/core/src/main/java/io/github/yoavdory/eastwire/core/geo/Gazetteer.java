package io.github.yoavdory.eastwire.core.geo;

import io.github.yoavdory.eastwire.core.config.City;
import io.github.yoavdory.eastwire.core.config.Country;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

/**
 * Finds cities from the city list in English text (headlines, permitted excerpts).
 *
 * <p>Matching is case-sensitive on whole words, longest name first ("New Delhi" wins over
 * "Delhi"). Names that are also ordinary English words or personal names ("Saga", "Nara",
 * "Sejong") count only when the same text also names that city's country; see
 * {@code requires_country_context} in config/city_curation.yaml.
 */
public final class Gazetteer {

    /** A city found in text. {@code weak} means it matched only thanks to country context. */
    public record Match(City city, String matchedText, boolean weak) {
    }

    private static final Map<String, List<String>> COUNTRY_WORDS = Map.of(
            "CN", List.of("China", "Chinese"),
            "IN", List.of("India", "Indian"),
            "JP", List.of("Japan", "Japanese"),
            "KR", List.of("South Korea", "South Korean", "Korea", "Korean"));

    private final Map<String, City> byName = new HashMap<>();
    private final Map<String, City> byFoldedName = new HashMap<>();
    private final Set<String> ambiguousNames = new HashSet<>();
    private final Set<String> contextRequired;
    private final Pattern pattern;
    private final Map<String, Pattern> countryPatterns = new LinkedHashMap<>();

    public Gazetteer(List<City> cities, List<Country> countries, Set<String> requiresCountryContext) {
        this.contextRequired = Set.copyOf(requiresCountryContext);
        for (City city : cities) {
            Set<String> names = new HashSet<>();
            names.add(city.name());
            names.add(city.asciiName());
            names.addAll(city.aliasList());
            for (String name : names) {
                City previous = byName.putIfAbsent(name, city);
                if (previous != null && previous.geonamesId() != city.geonamesId()) {
                    ambiguousNames.add(name);
                }
                byFoldedName.putIfAbsent(Geo.fold(name), city);
            }
        }
        String alternation = byName.keySet().stream()
                .sorted(Comparator.comparingInt(String::length).reversed())
                .map(Pattern::quote)
                .collect(Collectors.joining("|"));
        this.pattern = Pattern.compile("(?<![\\p{L}\\p{N}])(" + alternation + ")(?![\\p{L}\\p{N}])");
        for (Country country : countries) {
            List<String> words = COUNTRY_WORDS.getOrDefault(country.iso2(), List.of(country.name()));
            String alternatives = words.stream().map(Gazetteer::countryWord).collect(Collectors.joining("|"));
            countryPatterns.put(country.iso2(), Pattern.compile("(?<![\\p{L}])(" + alternatives + ")(?![\\p{L}])"));
        }
    }

    /**
     * A country word as a regex. A bare "Korea" or "Korean" counts for South Korea only when it is
     * not "North Korea", "N. Korea" or "N.Korea": North Korea is a different country.
     */
    private static String countryWord(String word) {
        if (word.startsWith("Korea")) {
            return "(?<!North )(?<!N\\. )(?<!N\\.)" + Pattern.quote(word);
        }
        return Pattern.quote(word);
    }

    /** Cities named in {@code text}, each at most once, in order of first appearance. */
    public List<Match> find(String text) {
        if (text == null || text.isBlank()) {
            return List.of();
        }
        Map<Long, Match> found = new LinkedHashMap<>();
        Matcher m = pattern.matcher(text);
        while (m.find()) {
            String name = m.group(1);
            if (ambiguousNames.contains(name)) {
                continue;
            }
            City city = byName.get(name);
            boolean needsContext = contextRequired.contains(city.name()) || contextRequired.contains(name);
            if (needsContext && !mentionsCountry(city.countryIso2(), text)) {
                continue;
            }
            found.putIfAbsent(city.geonamesId(), new Match(city, name, needsContext));
        }
        return new ArrayList<>(found.values());
    }

    /** Exact (accent- and case-insensitive) lookup, e.g. for a dateline such as "SEOUL". */
    public Optional<City> lookup(String name) {
        return Optional.ofNullable(byFoldedName.get(Geo.fold(name)));
    }

    /** True if {@code text} names the country (or its demonym), e.g. "Japan" or "Japanese". */
    public boolean mentionsCountry(String iso2, String text) {
        Pattern p = countryPatterns.get(iso2);
        return p != null && text != null && p.matcher(text).find();
    }
}
