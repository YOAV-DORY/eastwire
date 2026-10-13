package io.github.yoavdory.eastwire.core.geo;

import static org.assertj.core.api.Assertions.assertThat;

import io.github.yoavdory.eastwire.core.config.ComplianceConfig;
import io.github.yoavdory.eastwire.core.config.RepoConfig;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.ValueSource;

class DatelineDetectorTest {

    private static final ComplianceConfig CONFIG = RepoConfig.load();
    private final DatelineDetector detector = new DatelineDetector(
            new Gazetteer(CONFIG.cities(), CONFIG.activeCountries(), CONFIG.requiresCountryContext()));

    @ParameterizedTest
    @CsvSource(delimiter = '|', value = {
            "SEOUL (Yonhap) — The central bank held rates.|Seoul",
            "NEW DELHI: Ministers met on Friday.|New Delhi",
            "TOKYO, Japan - Trains resumed service.|Tokyo",
            "BOMBAY -- An old-style dateline.|Mumbai"})
    void readsCommonDatelineStyles(String text, String city) {
        assertThat(detector.detect(text)).get().extracting(c -> c.name()).isEqualTo(city);
    }

    @ParameterizedTest
    @ValueSource(strings = {
            "Seoul's central bank held rates on Friday.",   // a mention, not a dateline
            "WASHINGTON — Talks continued.",                 // not on the city list
            "BREAKING: Markets fall",                        // capitals but not a place
            ""})
    void ignoresTextWithoutAKnownDateline(String text) {
        assertThat(detector.detect(text)).isEmpty();
    }
}
