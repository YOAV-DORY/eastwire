package io.github.yoavdory.eastwire.api.map;

import static org.assertj.core.api.Assertions.assertThat;

import io.github.yoavdory.eastwire.api.map.MapRepository.LocationRow;
import io.github.yoavdory.eastwire.core.config.ComplianceConfig;
import io.github.yoavdory.eastwire.core.config.RepoConfig;
import io.github.yoavdory.eastwire.core.policy.DisplayPolicy;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Set;
import org.junit.jupiter.api.Test;

class MapServiceTest {

    private static final ComplianceConfig CONFIG = RepoConfig.load();
    private static final Instant NOW = Instant.parse("2026-10-13T12:00:00Z");
    private static final long TOKYO = 1850147L;
    private static final long OSAKA = 1853909L;

    private static LocationRow row(long article, String url, String role, String precision, String confidence,
            String country, Long place) {
        return new LocationRow(article, "gdelt-gkg", url, null, null, NOW.minusSeconds(3600), role, precision, confidence,
                country, place);
    }

    private static MapService service(List<LocationRow> rows) {
        MapRepository repo = new MapRepository(null) {
            @Override
            public List<LocationRow> locations(Instant since, String country) {
                return rows;
            }
        };
        return new MapService(repo, new DisplayPolicy(CONFIG), CONFIG, Clock.fixed(NOW, ZoneOffset.UTC));
    }

    private static final String MAINICHI = "https://mainichi.jp/english/articles/";

    @Test
    void pinsCityPrecisionStoriesAndCountsEachArticleOncePerCity() {
        MapService.MapData data = service(List.of(
                row(1, MAINICHI + "1", "mentioned", "city", "medium", "JP", TOKYO),
                row(1, MAINICHI + "1", "event", "city", "high", "JP", TOKYO),
                row(2, MAINICHI + "2", "mentioned", "city", "medium", "JP", TOKYO),
                row(3, MAINICHI + "3", "mentioned", "city", "low", "JP", OSAKA)))
                .map(MapService.Window.WEEK, Set.of("mentioned", "event"), null);

        assertThat(data.cities()).extracting(MapService.CityPin::name).containsExactly("Tokyo", "Osaka");
        MapService.CityPin tokyo = data.cities().getFirst();
        assertThat(tokyo.total()).isEqualTo(2);
        assertThat(tokyo.mentioned()).isEqualTo(2);
        assertThat(tokyo.event()).isEqualTo(1);
        assertThat(tokyo.lowConfidenceOnly()).isFalse();
        assertThat(tokyo.lat()).isBetween(35.0, 36.0);
        assertThat(data.cities().get(1).lowConfidenceOnly()).isTrue();
        assertThat(data.countryOnly()).isEmpty();
    }

    @Test
    void countryOnlyStoriesAreCountedSeparatelyNeverPinned() {
        MapService.MapData data = service(List.of(
                row(1, MAINICHI + "1", "mentioned", "country", "medium", "JP", null),
                row(2, MAINICHI + "2", "mentioned", "country", "medium", "JP", null),
                row(2, MAINICHI + "2", "mentioned", "city", "medium", "JP", TOKYO),   // has a city: not country-only
                row(3, "https://scroll.in/article/3", "mentioned", "country", "medium", "IN", null)))
                .map(MapService.Window.WEEK, Set.of("mentioned", "event"), null);

        assertThat(data.cities()).singleElement().extracting(MapService.CityPin::total).isEqualTo(1);
        assertThat(data.countryOnly()).containsExactly(new MapService.CountryOnly("IN", 1), new MapService.CountryOnly("JP", 1));
    }

    @Test
    void storiesTheDisplayPolicyHidesAreNotCounted() {
        MapService.MapData data = service(List.of(
                row(1, "https://www.scmp.com/news/1", "mentioned", "city", "medium", "JP", TOKYO),
                row(2, "https://unreviewed.example/2", "mentioned", "country", "medium", "JP", null)))
                .map(MapService.Window.WEEK, Set.of("mentioned", "event"), null);

        assertThat(data.cities()).isEmpty();
        assertThat(data.countryOnly()).isEmpty();
    }

    @Test
    void roleFilterApplies() {
        MapService.MapData data = service(List.of(
                row(1, MAINICHI + "1", "publisher", "country", "high", "JP", null),
                row(2, MAINICHI + "2", "event", "city", "high", "JP", OSAKA)))
                .map(MapService.Window.DAY, Set.of("event"), null);

        assertThat(data.cities()).singleElement().extracting(MapService.CityPin::event).isEqualTo(1);
        assertThat(data.countryOnly()).isEmpty();
        assertThat(data.window()).isEqualTo("24h");
        assertThat(data.roles()).containsExactly("event");
    }
}
