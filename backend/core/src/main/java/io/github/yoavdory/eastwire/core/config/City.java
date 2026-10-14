package io.github.yoavdory.eastwire.core.config;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.util.Arrays;
import java.util.List;

/** One row of {@code config/cities.csv}, generated from GeoNames by scripts/build_cities.py. */
@JsonIgnoreProperties(ignoreUnknown = true)
public record City(
        long geonamesId,
        String name,
        String asciiName,
        String countryIso2,
        String admin1Code,
        String admin1Name,
        double lat,
        double lon,
        long population,
        String populationSource,
        String featureCode,
        String reasons,
        String aliases) {

    /** Curated alternative names (e.g. Bombay for Mumbai); empty if none. */
    public List<String> aliasList() {
        if (aliases == null || aliases.isBlank()) {
            return List.of();
        }
        return Arrays.stream(aliases.split("\\|")).map(String::strip).filter(a -> !a.isEmpty()).toList();
    }

    public boolean isNationalCapital() {
        return reasons != null && reasons.contains("national_capital");
    }
}
