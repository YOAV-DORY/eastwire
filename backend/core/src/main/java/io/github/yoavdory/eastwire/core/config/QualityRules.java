package io.github.yoavdory.eastwire.core.config;

import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Locale;
import tools.jackson.databind.DeserializationFeature;
import tools.jackson.databind.PropertyNamingStrategies;
import tools.jackson.dataformat.yaml.YAMLMapper;

/**
 * {@code config/quality.yaml}: patterns for items that are not news (press releases,
 * sponsored content). A match is skipped at ingestion and removed from storage.
 */
public record QualityRules(List<String> urlContains, List<String> titleContains) {

    private static final YAMLMapper YAML = YAMLMapper.builder()
            .propertyNamingStrategy(PropertyNamingStrategies.SNAKE_CASE)
            .enable(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES)
            .build();

    public QualityRules {
        urlContains = urlContains == null ? List.of() : urlContains.stream().map(QualityRules::lower).toList();
        titleContains = titleContains == null ? List.of() : titleContains.stream().map(QualityRules::lower).toList();
    }

    public static QualityRules load(Path configDir) {
        Path file = configDir.resolve("quality.yaml");
        try (InputStream in = Files.newInputStream(file)) {
            return YAML.readValue(in, RulesFile.class).notNews();
        } catch (IOException e) {
            throw new UncheckedIOException("Cannot read " + file, e);
        }
    }

    /** The rule that marks this item as not news, or null if it is news. */
    public String notNewsReason(String url, String title) {
        String u = lower(url);
        String t = lower(title);
        for (String p : urlContains) {
            if (u.contains(p)) {
                return "address contains " + p;
            }
        }
        for (String p : titleContains) {
            if (t.contains(p)) {
                return "headline contains " + p;
            }
        }
        return null;
    }

    private static String lower(String s) {
        return s == null ? "" : s.toLowerCase(Locale.ROOT);
    }

    private record RulesFile(QualityRules notNews) {
    }
}
