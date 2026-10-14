package io.github.yoavdory.eastwire.core.sector;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;
import tools.jackson.core.StreamReadFeature;
import tools.jackson.databind.DeserializationFeature;
import tools.jackson.databind.PropertyNamingStrategies;
import tools.jackson.dataformat.yaml.YAMLMapper;

/**
 * The parsed {@code config/sectors.yaml}.
 *
 * @param version short hash of the file, stored with each article so a rule change re-tags old articles
 */
public record SectorRules(
        double threshold,
        int maxSectors,
        double excerptFactor,
        double themeCap,
        List<SectorDefinition> sectors,
        String version) {

    /** The database allows exactly these (V1 check constraint on article_sector.sector). */
    public static final Set<String> SLUGS = Set.of("economy", "geopolitics", "technology", "business", "society", "environment");

    private static final YAMLMapper YAML = YAMLMapper.builder()
            .propertyNamingStrategy(PropertyNamingStrategies.SNAKE_CASE)
            .enable(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES)   // a typo must not silently drop a rule
            .enable(StreamReadFeature.STRICT_DUPLICATE_DETECTION)        // nor a keyword listed twice
            .build();

    public SectorRules {
        sectors = List.copyOf(sectors);
        check(threshold, maxSectors, excerptFactor, themeCap, sectors);
    }

    public static SectorRules load(Path configDir) {
        Path file = configDir.resolve("sectors.yaml");
        try {
            byte[] bytes = Files.readAllBytes(file);
            RulesFile f = YAML.readValue(bytes, RulesFile.class);
            return new SectorRules(f.threshold(), f.maxSectors(), f.excerptFactor(), f.themeCap(), f.sectors(), hash(bytes));
        } catch (IOException e) {
            throw new UncheckedIOException("Cannot read " + file, e);
        } catch (RuntimeException e) {
            throw new IllegalStateException("Invalid " + file + ": " + e.getMessage(), e);
        }
    }

    public Optional<SectorDefinition> sector(String slug) {
        return sectors.stream().filter(s -> s.slug().equals(slug)).findFirst();
    }

    private static void check(double threshold, int maxSectors, double excerptFactor, double themeCap,
            List<SectorDefinition> sectors) {
        if (threshold <= 0 || maxSectors < 1 || excerptFactor < 0 || excerptFactor > 1 || themeCap < 0) {
            throw new IllegalStateException("threshold > 0, max_sectors >= 1, 0 <= excerpt_factor <= 1, theme_cap >= 0");
        }
        Set<String> slugs = sectors.stream().map(SectorDefinition::slug).collect(Collectors.toSet());
        if (!slugs.equals(SLUGS) || sectors.size() != SLUGS.size()) {
            throw new IllegalStateException("Sectors must be exactly " + SLUGS + ", got " + sectors.stream().map(SectorDefinition::slug).toList());
        }
        for (SectorDefinition s : sectors) {
            for (Map<String, Double> rules : List.of(s.keywords(), s.negative(), s.gdeltThemes(), s.feedCategories())) {
                rules.forEach((rule, weight) -> {
                    if (weight == null || weight <= 0) {
                        throw new IllegalStateException(s.slug() + ": weight of '" + rule + "' must be positive");
                    }
                });
            }
            s.keywords().keySet().forEach(Term::parse);
            s.negative().keySet().forEach(Term::parse);
            s.gdeltThemes().keySet().forEach(code -> {
                if (!code.matches("[A-Z0-9_]+\\*?")) {
                    throw new IllegalStateException(s.slug() + ": GDELT theme codes are upper case, got '" + code + "'");
                }
            });
        }
    }

    private static String hash(byte[] bytes) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(bytes)).substring(0, 12);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }

    private record RulesFile(double threshold, int maxSectors, double excerptFactor, double themeCap, List<SectorDefinition> sectors) {
    }
}
