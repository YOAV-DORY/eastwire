package io.github.yoavdory.eastwire.core.config;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.time.LocalDate;
import java.util.List;

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
        String excerptNote,
        String label,
        String wireCreditMode,
        String partnerReprints,
        Integer retentionDays,
        String publisherCountry,
        Long publisherCityGeonamesId,
        List<String> feeds,
        License license,
        Evidence evidence) {

    public SourceConfig {
        feeds = feeds == null ? List.of() : List.copyOf(feeds);
    }

    /** Content license, when the source has one (Global Voices: CC BY 3.0). */
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record License(String name, String url) {
    }

    /** Where the permission decision for this source comes from. */
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Evidence(String url, LocalDate checkedOn, String note) {
    }

    /** A copy reading different feed URLs (tests point a source at a local server). */
    public SourceConfig withFeeds(List<String> newFeeds) {
        return new SourceConfig(slug, name, kind, connector, status, enabled, displayMode,
                maxExcerptChars, images, attribution, excerptNote, label, wireCreditMode, partnerReprints,
                retentionDays, publisherCountry, publisherCityGeonamesId, newFeeds, license, evidence);
    }

    /** A copy with a different {@code enabled} flag; used when a conditional source is turned on. */
    public SourceConfig withEnabled(boolean newEnabled) {
        return new SourceConfig(slug, name, kind, connector, status, newEnabled, displayMode,
                maxExcerptChars, images, attribution, excerptNote, label, wireCreditMode, partnerReprints,
                retentionDays, publisherCountry, publisherCityGeonamesId, feeds, license, evidence);
    }
}
