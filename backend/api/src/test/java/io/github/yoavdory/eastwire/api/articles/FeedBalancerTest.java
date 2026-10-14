package io.github.yoavdory.eastwire.api.articles;

import static org.assertj.core.api.Assertions.assertThat;

import io.github.yoavdory.eastwire.api.articles.ArticleRow.LocationRow;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.Test;

class FeedBalancerTest {

    private static final Instant NOW = Instant.parse("2026-10-14T12:00:00Z");

    private static ArticleRow row(long id, String country, Duration age) {
        List<LocationRow> places = country == null ? List.of()
                : List.of(new LocationRow("mentioned", "country", "medium", "gdelt_gkg", country, null, null, null, true),
                        new LocationRow("publisher", "country", "high", "source_registry", "IN", null, null, null, false));
        return new ArticleRow(id, "gdelt-gkg", "Headline " + id, "https://x/" + id, "x", null, null, null, null, null, null,
                NOW.minus(age), NOW.minus(age), 1, places, List.of());
    }

    @Test
    void dealsCountriesInTurnNewestFirst() {
        List<ArticleRow> newestFirst = List.of(row(1, "IN", Duration.ofMinutes(5)), row(2, "IN", Duration.ofMinutes(10)),
                row(3, "IN", Duration.ofMinutes(20)), row(4, "JP", Duration.ofHours(3)), row(5, "IN", Duration.ofHours(4)),
                row(6, "CN", Duration.ofDays(2)), row(7, null, Duration.ofDays(3)));
        assertThat(FeedBalancer.balance(newestFirst, NOW)).extracting(ArticleRow::id)
                .containsExactly(1L, 4L, 6L, 7L, 2L, 3L, 5L);
    }

    @Test
    void storiesOlderThan30DaysFollowByDate() {
        List<ArticleRow> newestFirst = List.of(row(1, "IN", Duration.ofHours(1)), row(2, "JP", Duration.ofDays(40)),
                row(3, "IN", Duration.ofHours(2)));
        assertThat(FeedBalancer.balance(newestFirst, NOW)).extracting(ArticleRow::id).containsExactly(1L, 3L, 2L);
    }

    @Test
    void thePublisherBaseNeverDecidesTheCountry() {
        assertThat(FeedBalancer.country(row(1, null, Duration.ZERO))).isEqualTo(FeedBalancer.NO_COUNTRY);
        assertThat(FeedBalancer.country(row(2, "KR", Duration.ZERO))).isEqualTo("KR");
    }
}
