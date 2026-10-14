package io.github.yoavdory.eastwire.core.sector;

import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * One sector from {@code sectors.yaml}: what it means and the rules that tag it.
 * Maps keep the file's order, which is also the order shown to readers.
 *
 * @param keywords       keyword or phrase to weight; trailing * matches word endings
 * @param negative       phrase to weight subtracted when present ("flood of" is not a flood)
 * @param gdeltThemes    GDELT theme code to weight; trailing * matches a code prefix
 * @param feedCategories publisher topic tag (exact, case-insensitive) to weight
 */
public record SectorDefinition(
        String slug,
        String label,
        String definition,
        Map<String, Double> keywords,
        Map<String, Double> negative,
        Map<String, Double> gdeltThemes,
        Map<String, Double> feedCategories) {

    public SectorDefinition {
        if (slug == null || label == null || definition == null) {
            throw new IllegalStateException("Every sector needs slug, label and definition");
        }
        definition = definition.strip();
        keywords = copy(keywords);
        negative = copy(negative);
        gdeltThemes = copy(gdeltThemes);
        feedCategories = copy(feedCategories);
    }

    private static Map<String, Double> copy(Map<String, Double> map) {
        return map == null ? Map.of() : Collections.unmodifiableMap(new LinkedHashMap<>(map));
    }
}
