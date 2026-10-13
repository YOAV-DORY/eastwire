package io.github.yoavdory.eastwire.core.config;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

/**
 * One entry of {@code config/countries.yaml}. GDELT identifies countries by FIPS 10-4 code
 * (China = CH, Japan = JA, South Korea = KS), everything else in EastWire uses ISO 3166 alpha-2.
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record Country(String iso2, String fips, String name, int phase) {
}
