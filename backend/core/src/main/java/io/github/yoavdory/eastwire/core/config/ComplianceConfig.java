package io.github.yoavdory.eastwire.core.config;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import tools.jackson.databind.DeserializationFeature;
import tools.jackson.databind.MapperFeature;
import tools.jackson.databind.MappingIterator;
import tools.jackson.databind.PropertyNamingStrategies;
import tools.jackson.dataformat.csv.CsvMapper;
import tools.jackson.dataformat.csv.CsvSchema;
import tools.jackson.dataformat.yaml.YAMLMapper;

/**
 * Everything in the repo-level {@code config/} directory, loaded once at startup.
 *
 * <p>Loading fails closed: if the files contradict the source matrix's hard rules (for example
 * an excluded source marked enabled), the application refuses to start rather than show
 * something it has no permission to show.
 */
public record ComplianceConfig(
        List<SourceConfig> sources,
        List<DomainPolicy> domains,
        List<Country> countries,
        List<City> cities,
        Set<String> requiresCountryContext) {

    /** System property / Spring property naming the config directory. */
    public static final String CONFIG_DIR_PROPERTY = "eastwire.config-dir";

    private static final YAMLMapper YAML = YAMLMapper.builder()
            .propertyNamingStrategy(PropertyNamingStrategies.SNAKE_CASE)
            .enable(MapperFeature.ACCEPT_CASE_INSENSITIVE_ENUMS)
            .disable(DeserializationFeature.FAIL_ON_NULL_FOR_PRIMITIVES)
            .build();

    private static final CsvMapper CSV = CsvMapper.builder()
            .propertyNamingStrategy(PropertyNamingStrategies.SNAKE_CASE)
            .build();

    public ComplianceConfig {
        sources = List.copyOf(sources);
        domains = List.copyOf(domains);
        countries = List.copyOf(countries);
        cities = List.copyOf(cities);
        requiresCountryContext = Set.copyOf(requiresCountryContext);
        checkHardRules(sources, domains);
    }

    public ComplianceConfig(List<SourceConfig> sources, List<DomainPolicy> domains, List<Country> countries, List<City> cities) {
        this(sources, domains, countries, cities, Set.of());
    }

    public static ComplianceConfig load(Path dir) {
        return new ComplianceConfig(
                readYaml(dir.resolve("sources.yaml"), SourcesFile.class).sources(),
                readYaml(dir.resolve("domains.yaml"), DomainsFile.class).domains(),
                readYaml(dir.resolve("countries.yaml"), CountriesFile.class).countries(),
                readCities(dir.resolve("cities.csv")),
                readYaml(dir.resolve("city_curation.yaml"), CurationFile.class).requiresCountryContext());
    }

    public Optional<SourceConfig> source(String slug) {
        return sources.stream().filter(s -> s.slug().equals(slug)).findFirst();
    }

    /** Maps a GDELT FIPS 10-4 country code (e.g. "KS") to EastWire's ISO code ("KR"), if covered. */
    public Optional<Country> countryForFips(String fips) {
        return countries.stream().filter(c -> c.fips().equals(fips)).findFirst();
    }

    /** Countries in the current phase (the MVP's four). */
    public List<Country> activeCountries() {
        return countries.stream().filter(c -> c.phase() == 1).toList();
    }

    /** The most specific domain entry covering {@code host} (sub.example.com beats example.com). */
    public Optional<DomainPolicy> domainPolicyFor(String host) {
        return domains.stream()
                .filter(d -> d.covers(host))
                .max(Comparator.comparingInt(d -> d.domain().length()));
    }

    /** A copy with one source replaced (matched by slug), e.g. to turn on a conditional source. */
    public ComplianceConfig withSource(SourceConfig replacement) {
        List<SourceConfig> updated = sources.stream()
                .map(s -> s.slug().equals(replacement.slug()) ? replacement : s)
                .toList();
        return new ComplianceConfig(updated, domains, countries, cities, requiresCountryContext);
    }

    private static void checkHardRules(List<SourceConfig> sources, List<DomainPolicy> domains) {
        Set<String> slugs = new HashSet<>();
        for (SourceConfig s : sources) {
            if (!slugs.add(s.slug())) {
                throw new IllegalStateException("Duplicate source slug: " + s.slug());
            }
            if (s.status() == SourceStatus.EXCLUDED && s.enabled()) {
                throw new IllegalStateException("Excluded source must not be enabled: " + s.slug());
            }
            if (s.images()) {
                throw new IllegalStateException("No source may show images in the MVP: " + s.slug());
            }
        }
        Set<String> domainNames = new HashSet<>();
        for (DomainPolicy d : domains) {
            if (!domainNames.add(d.domain())) {
                throw new IllegalStateException("Duplicate domain policy: " + d.domain());
            }
        }
    }

    private static <T> T readYaml(Path file, Class<T> type) {
        try (InputStream in = Files.newInputStream(file)) {
            return YAML.readValue(in, type);
        } catch (IOException e) {
            throw new UncheckedIOException("Cannot read " + file, e);
        }
    }

    private static List<City> readCities(Path file) {
        CsvSchema schema = CsvSchema.emptySchema().withHeader();
        try (InputStream in = Files.newInputStream(file);
                MappingIterator<City> rows = CSV.readerFor(City.class).with(schema).readValues(in)) {
            return rows.readAll();
        } catch (IOException e) {
            throw new UncheckedIOException("Cannot read " + file, e);
        }
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record SourcesFile(List<SourceConfig> sources) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record DomainsFile(List<DomainPolicy> domains) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record CountriesFile(List<Country> countries) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record CurationFile(Set<String> requiresCountryContext) {
        CurationFile {
            requiresCountryContext = requiresCountryContext == null ? Set.of() : requiresCountryContext;
        }
    }
}
