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
        Evidence evidence,
        String publisher,
        String coversCountry,
        String storyType,
        List<String> featureCategories,
        String publisherLabel,
        String publisherLabelEvidence,
        List<String> skipCategories,
        boolean summaries,
        String feedTimezone,
        String feedTimePrecision) {

    public SourceConfig {
        feeds = feeds == null ? List.of() : List.copyOf(feeds);
        featureCategories = featureCategories == null ? List.of() : List.copyOf(featureCategories);
        skipCategories = skipCategories == null ? List.of() : List.copyOf(skipCategories);
    }

    /**
     * The zone a feed's dates are written in when they carry none (BusinessKorea, Korea.net:
     * Seoul time), or null for feeds whose dates are complete.
     */
    public java.time.ZoneId feedZone() {
        return feedTimezone == null || feedTimezone.isBlank() ? null : java.time.ZoneId.of(feedTimezone);
    }

    /** True when the feed gives only the day of publication, not the time (Korea.net). */
    public boolean datesAreDaysOnly() {
        return "day".equals(feedTimePrecision);
    }

    /** True when an item filed under one of these feed categories is not news for EastWire (e.g. readers' posts). */
    public boolean isSkipped(java.util.Collection<String> itemCategories) {
        return itemCategories.stream().anyMatch(c -> skipCategories.stream().anyMatch(f -> f.equalsIgnoreCase(c.strip())));
    }

    /**
     * Whether an item from this source is a feature (essay, explainer, citizen media) rather than
     * news: the source's own {@code story_type}, or one of its {@code feature_categories}.
     */
    public boolean isFeature(java.util.Collection<String> itemCategories) {
        if ("feature".equals(storyType)) {
            return true;
        }
        return itemCategories.stream().anyMatch(c -> featureCategories.stream().anyMatch(f -> f.equalsIgnoreCase(c.strip())));
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
                retentionDays, publisherCountry, publisherCityGeonamesId, newFeeds, license, evidence, publisher,
                coversCountry, storyType, featureCategories, publisherLabel, publisherLabelEvidence, skipCategories,
                summaries, feedTimezone, feedTimePrecision);
    }

    /** A copy with a different {@code enabled} flag; used when a conditional source is turned on. */
    public SourceConfig withEnabled(boolean newEnabled) {
        return new SourceConfig(slug, name, kind, connector, status, newEnabled, displayMode,
                maxExcerptChars, images, attribution, excerptNote, label, wireCreditMode, partnerReprints,
                retentionDays, publisherCountry, publisherCityGeonamesId, feeds, license, evidence, publisher,
                coversCountry, storyType, featureCategories, publisherLabel, publisherLabelEvidence, skipCategories,
                summaries, feedTimezone, feedTimePrecision);
    }
}
