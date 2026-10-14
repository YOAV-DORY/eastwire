package io.github.yoavdory.eastwire.ingest.gdelt;

import static io.github.yoavdory.eastwire.ingest.gdelt.GkgFixtures.HOSUR;
import static io.github.yoavdory.eastwire.ingest.gdelt.GkgFixtures.INDIA;
import static io.github.yoavdory.eastwire.ingest.gdelt.GkgFixtures.NEW_DELHI;
import static io.github.yoavdory.eastwire.ingest.gdelt.GkgFixtures.SEOUL;
import static io.github.yoavdory.eastwire.ingest.gdelt.GkgFixtures.TAMIL_NADU;
import static io.github.yoavdory.eastwire.ingest.gdelt.GkgFixtures.TEXAS_CITY;
import static io.github.yoavdory.eastwire.ingest.gdelt.GkgFixtures.UNITED_STATES;
import static org.assertj.core.api.Assertions.assertThat;

import io.github.yoavdory.eastwire.core.article.Location;
import io.github.yoavdory.eastwire.core.article.Location.Precision;
import io.github.yoavdory.eastwire.core.article.Location.Role;
import io.github.yoavdory.eastwire.core.config.ComplianceConfig;
import io.github.yoavdory.eastwire.core.config.RepoConfig;
import java.util.List;
import org.junit.jupiter.api.Test;

class GkgLocationMapperTest {

    private static final ComplianceConfig CONFIG = RepoConfig.load();
    private final GkgLocationMapper mapper = new GkgLocationMapper(CONFIG);

    private List<Location> map(String locations) {
        return mapper.map(GkgParser.parseLocations(locations));
    }

    @Test
    void pinsAWorldCityToTheCityListWhenNameAndDistanceAgree() {
        List<Location> result = map(NEW_DELHI);
        assertThat(result).singleElement().satisfies(l -> {
            assertThat(l.precision()).isEqualTo(Precision.CITY);
            assertThat(l.placeId()).isEqualTo(1261481L); // New Delhi in GeoNames
            assertThat(l.countryIso2()).isEqualTo("IN");
            assertThat(l.role()).isEqualTo(Role.MENTIONED);
            // Capitals often stand for the government ("New Delhi said...").
            assertThat(l.confidence()).isEqualTo(Location.Confidence.LOW);
        });
    }

    @Test
    void mapsFipsCodesToIso() {
        assertThat(map(SEOUL)).singleElement().satisfies(l -> {
            assertThat(l.countryIso2()).isEqualTo("KR");
            assertThat(l.precision()).isEqualTo(Precision.CITY);
        });
    }

    @Test
    void aCityNotOnTheListStaysAtCountryPrecisionAndSaysSo() {
        assertThat(map(HOSUR)).singleElement().satisfies(l -> {
            assertThat(l.precision()).isEqualTo(Precision.COUNTRY);
            assertThat(l.placeId()).isNull();
            assertThat(l.evidence()).isEqualTo("Mentions Hosur (not on the city list)");
        });
    }

    @Test
    void countriesAreNeverPinnedToTheCapital() {
        assertThat(map(INDIA)).singleElement().satisfies(l -> {
            assertThat(l.precision()).isEqualTo(Precision.COUNTRY);
            assertThat(l.placeId()).isNull();
        });
    }

    @Test
    void statesAreKeptAtAdmin1Precision() {
        assertThat(map(TAMIL_NADU)).singleElement().extracting(Location::precision).isEqualTo(Precision.ADMIN1);
    }

    @Test
    void placesOutsideCoveredCountriesAreDroppedAndDuplicatesMerged() {
        assertThat(map(UNITED_STATES + ";" + TEXAS_CITY)).isEmpty();
        assertThat(map(INDIA + ";" + INDIA + ";" + NEW_DELHI)).hasSize(2);
    }

    @Test
    void keepsPlacesInTheOrderTheTextMentionsThem() {
        // Seoul is listed first but mentioned at character 40; India at character 16.
        assertThat(map(SEOUL + ";" + INDIA)).extracting(Location::countryIso2).containsExactly("IN", "KR");
    }

    @Test
    void theLeadPlaceCountsOnlyWhenTheTextOpensWithACoveredCountry() {
        String saudiFirst = "1#Saudi Arabia#SA#SA##25#45#SA#5";
        assertThat(mapper.leadIsCovered(GkgParser.parseLocations(SEOUL + ";" + INDIA))).isTrue();
        assertThat(mapper.leadIsCovered(GkgParser.parseLocations(SEOUL + ";" + saudiFirst))).isFalse();
        // V1 locations carry no position, so there is no lead at all.
        assertThat(mapper.leadIsCovered(GkgParser.parseLocations("1#India#IN#IN##20#77#IN"))).isFalse();
    }
}
