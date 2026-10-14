package io.github.yoavdory.eastwire.core.config;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.time.LocalDate;

/**
 * One entry of {@code config/sources.yaml}. Only the fields the application acts on are
 * mapped; descriptive fields (endpoints, quota notes, ...) stay in the YAML for humans.
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record SourceConfig(
        String slug,
        String name,
        SourceKind kind,
        String connector,
        SourceStatus status,
        boolean enabled,
        DisplayMode displayMode,
        int maxExcerptChars,
        boolean images,
        String attribution,
        String label,
        String wireCreditMode,
        String partnerReprints,
        Integer retentionDays,
        String publisherCountry,
        Long publisherCityGeonamesId,
        Evidence evidence) {

    /** Where the permission decision for this source comes from. */
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Evidence(String url, LocalDate checkedOn, String note) {
    }

    /** A copy with a different {@code enabled} flag; used when a conditional source is turned on. */
    public SourceConfig withEnabled(boolean newEnabled) {
        return new SourceConfig(slug, name, kind, connector, status, newEnabled, displayMode,
                maxExcerptChars, images, attribution, label, wireCreditMode, partnerReprints,
                retentionDays, publisherCountry, publisherCityGeonamesId, evidence);
    }
}
