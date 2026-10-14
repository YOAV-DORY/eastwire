package io.github.yoavdory.eastwire.core.geo;

import static org.assertj.core.api.Assertions.assertThat;

import io.github.yoavdory.eastwire.core.article.Location;
import io.github.yoavdory.eastwire.core.article.Location.Confidence;
import io.github.yoavdory.eastwire.core.article.Location.Method;
import io.github.yoavdory.eastwire.core.article.Location.Precision;
import io.github.yoavdory.eastwire.core.article.Location.Role;
import io.github.yoavdory.eastwire.core.config.ComplianceConfig;
import io.github.yoavdory.eastwire.core.config.RepoConfig;
import java.util.List;
import org.junit.jupiter.api.Test;

/** Invented headlines. */
class PrimaryPlacesTest {

    private static final ComplianceConfig CONFIG = RepoConfig.load();
    private static final Gazetteer GAZETTEER = new Gazetteer(CONFIG.cities(), CONFIG.activeCountries(), CONFIG.requiresCountryContext());
    private static final long OSAKA = 1853909L;
    private static final long MUMBAI = 1275339L;

    private static Location country(String iso2, Method method) {
        return new Location(null, iso2, Role.MENTIONED, Precision.COUNTRY, Confidence.MEDIUM, method, "Mentions " + iso2);
    }

    private static Location city(long id, String iso2) {
        return new Location(id, iso2, Role.MENTIONED, Precision.CITY, Confidence.MEDIUM, Method.GDELT_GKG, "Mentions city");
    }

    private static List<Boolean> primary(String headline, List<Location> locations, boolean inTextOrder) {
        return PrimaryPlaces.mark(headline, locations, GAZETTEER, inTextOrder).stream().map(Location::primary).toList();
    }

    @Test
    void aPassingMentionIsNotTheSubject() {
        // An Indian company's results that name a Japanese supplier further down the text.
        List<Location> places = List.of(country("IN", Method.GDELT_GKG), country("JP", Method.GDELT_GKG));
        assertThat(primary("Shoe maker posts record quarterly profit", places, true)).containsExactly(true, false);
    }

    @Test
    void theHeadlineMakesAPlaceTheSubject() {
        assertThat(primary("Osaka port expansion approved", List.of(country("IN", Method.GDELT_GKG), city(OSAKA, "JP"),
                country("JP", Method.GDELT_GKG)), true)).containsExactly(true, true, true);
        assertThat(primary("Japanese exporters brace for a stronger yen", List.of(country("JP", Method.GAZETTEER)), false))
                .containsExactly(true);
    }

    @Test
    void theDatelineAlwaysCountsAndThePublisherNever() {
        Location dateline = new Location(MUMBAI, "IN", Role.EVENT, Precision.CITY, Confidence.HIGH, Method.DATELINE, "Dateline");
        Location publisher = new Location(null, "IN", Role.PUBLISHER, Precision.COUNTRY, Confidence.HIGH,
                Method.SOURCE_REGISTRY, "Publisher");
        assertThat(primary("Talks resume", List.of(publisher, dateline), true)).containsExactly(false, true);
    }

    @Test
    void aSingleFilingCountryCountsButSeveralDoNot() {
        assertThat(primary("A village library reopens", List.of(country("KR", Method.FEED_CATEGORY)), false)).containsExactly(true);
        assertThat(primary("Neighbours compare notes", List.of(country("CN", Method.FEED_CATEGORY),
                country("JP", Method.FEED_CATEGORY)), false)).containsExactly(false, false);
    }

    @Test
    void withoutTextOrderTheFirstPlaceIsNotTheLead() {
        assertThat(primary("Quarterly results", List.of(country("IN", Method.GDELT_GKG)), false)).containsExactly(false);
    }
}
