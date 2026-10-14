package io.github.yoavdory.eastwire.core.sector;

import java.util.Collections;
import java.util.Set;
import java.util.TreeSet;

/**
 * What a source told us about an article's topic, besides its text. Stored with the article so
 * it can be re-tagged when the rules change.
 *
 * @param gdeltThemes    GDELT GKG theme codes (e.g. ECON_INFLATION); derived by GDELT from text we never show
 * @param feedCategories the publisher's own topic tags (e.g. Global Voices "Environment")
 */
public record SectorSignals(Set<String> gdeltThemes, Set<String> feedCategories) {

    public static final SectorSignals NONE = new SectorSignals(Set.of(), Set.of());

    public SectorSignals {
        // Sorted, so the stored JSON is stable and easy to read.
        gdeltThemes = gdeltThemes == null ? Set.of() : Collections.unmodifiableSet(new TreeSet<>(gdeltThemes));
        feedCategories = feedCategories == null ? Set.of() : Collections.unmodifiableSet(new TreeSet<>(feedCategories));
    }

    public static SectorSignals themes(Set<String> themes) {
        return new SectorSignals(themes, Set.of());
    }

    public static SectorSignals categories(Set<String> categories) {
        return new SectorSignals(Set.of(), categories);
    }
}
