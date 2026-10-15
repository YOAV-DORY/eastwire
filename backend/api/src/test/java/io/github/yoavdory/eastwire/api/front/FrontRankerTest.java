package io.github.yoavdory.eastwire.api.front;

import static org.assertj.core.api.Assertions.assertThat;

import io.github.yoavdory.eastwire.api.articles.ArticleRow;
import io.github.yoavdory.eastwire.api.articles.ArticleRow.LocationRow;
import io.github.yoavdory.eastwire.api.articles.ArticleRow.SectorRow;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

/** Invented headlines; only the ranking rules are under test. */
class FrontRankerTest {

    private static final Instant NOW = Instant.parse("2026-10-15T12:00:00Z");
    private final Map<Long, String> publishers = new HashMap<>();

    private ArticleRow story(long id, String title, String publisher, double hoursAgo, String country, String sector,
            Long cluster, int clusterSize, boolean published) {
        publishers.put(id, publisher);
        Instant t = NOW.minus(Duration.ofMinutes(Math.round(hoursAgo * 60)));
        List<LocationRow> places = country == null ? List.of()
                : List.of(new LocationRow("mentioned", "country", "high", "gazetteer", country, null, null, "x", true));
        List<SectorRow> sectors = sector == null ? List.of() : List.of(new SectorRow(sector, 4, "[]"));
        return new ArticleRow(id, "test", title, "https://example.test/" + id, "example.test", null, null, null, null, null,
                null, published ? t : null, t, clusterSize, places, sectors, cluster, "news", t);
    }

    private ArticleRow story(long id, String title, String publisher, double hoursAgo, String country, String sector) {
        return story(id, title, publisher, hoursAgo, country, sector, null, 1, true);
    }

    @Test
    void theLeadIsSignificantFreshAndRelevantNotJustTheNewest() {
        var newest = story(1, "Local festival draws crowds to the old town", "A", 0.5, "JP", "society");
        var bigger = story(2, "Japan and the US agree on chip export controls", "B", 3, "JP", "geopolitics");
        var selection = FrontRanker.select(List.of(newest, bigger), publishers, NOW);

        assertThat(selection.lead().row().id()).isEqualTo(2);
        assertThat(selection.lead().why()).contains("Published 3 h ago", "Geopolitics")
                .anyMatch(w -> w.startsWith("Reaches beyond one country"));
    }

    @Test
    void freshnessHalvesAboutEveryTwelveHours() {
        var today = FrontRanker.score(story(1, "Port opens a new terminal", "A", 0, "KR", null), "A", NOW);
        var yesterday = FrontRanker.score(story(2, "Port opens a new terminal", "A", 12, "KR", null), "A", NOW);
        assertThat(today.score() - yesterday.score()).isCloseTo(1.5, org.assertj.core.data.Offset.offset(0.01));
    }

    @Test
    void routineMarketItemsAndStoriesWithNoMainPlaceAreNeverLeads() {
        var routine = story(1, "Sensex, Nifty open higher; stocks to watch today", "A", 0.1, "IN", "economy");
        var placeless = story(2, "Analysts weigh a quiet week ahead", "B", 0.2, null, "economy");
        var ordinary = story(3, "City council approves a new metro line", "C", 6, "IN", "society");
        var selection = FrontRanker.select(List.of(routine, placeless, ordinary), publishers, NOW);

        assertThat(selection.lead().row().id()).isEqualTo(3);
        assertThat(selection.secondary()).isEmpty();
        assertThat(selection.rest()).extracting(s -> s.row().id()).containsExactlyInAnyOrder(1L, 2L);
        assertThat(FrontRanker.score(routine, "A", NOW).why()).contains("Routine market item, ranked lower");
    }

    @Test
    void storiesWithoutAPublicationTimeSayTheyWereFound() {
        var found = FrontRanker.score(story(1, "Ferry service resumes", "A", 2, "JP", null, null, 1, false), "A", NOW);
        var published = FrontRanker.score(story(2, "Ferry service resumes", "A", 2, "JP", null, null, 1, true), "A", NOW);
        assertThat(found.why().getFirst()).isEqualTo("Found 2 h ago; the source gives no publication time");
        assertThat(found.score()).isLessThan(published.score());
    }

    @Test
    void oneStoryPerEventByClusterOrSimilarHeadline() {
        var a = story(1, "Bank acquisition puts insurer stake at a crossroads", "A", 1, "IN", "business", 7L, 2, true);
        var b = story(2, "Different words entirely about the same deal", "B", 2, "IN", "business", 7L, 2, true);
        var c = story(3, "Bank deal puts insurer stake at a crossroads again", "C", 3, "IN", "business");
        var d = story(4, "Rail strike halts commuter trains", "D", 1, "KR", "society");
        var selection = FrontRanker.select(List.of(a, b, c, d), publishers, NOW);

        assertThat(selection.events()).isEqualTo(2);
        List<Long> shown = new ArrayList<>();
        shown.add(selection.lead().row().id());
        selection.secondary().forEach(s -> shown.add(s.row().id()));
        selection.rest().forEach(s -> shown.add(s.row().id()));
        assertThat(shown).containsExactlyInAnyOrder(1L, 4L);
        assertThat(FrontRanker.score(a, "A", NOW).why()).contains("Also reported by 1 other outlet");
    }

    @Test
    void secondaryStoriesPreferOtherPublishersAndCountries() {
        var lead = story(1, "Japan and the US agree on chip export controls", "A", 1, "JP", "geopolitics");
        var sameEverything = story(2, "Japan cabinet approves a defence budget", "A", 1, "JP", "geopolitics");
        var other = story(3, "Seoul subway extends night service", "B", 2, "KR", "society");
        var third = story(4, "Delhi court rules on air pollution measures", "C", 3, "IN", "environment");
        var selection = FrontRanker.select(List.of(lead, sameEverything, other, third), publishers, NOW);

        assertThat(selection.lead().row().id()).isEqualTo(1);
        assertThat(selection.secondary()).extracting(s -> s.row().id()).containsExactlyInAnyOrder(3L, 4L);
        assertThat(selection.rest()).extracting(s -> s.row().id()).containsExactly(2L);
    }

    @Test
    void noPublisherFillsTheListWhileOthersWait() {
        List<ArticleRow> rows = new ArrayList<>();
        for (int i = 0; i < 8; i++) {
            rows.add(story(10 + i, "Business Standard style story number " + i + " on " + (char) ('a' + i) + "topic", "BigWire",
                    0.1 * i, "IN", "business"));
        }
        rows.add(story(30, "Typhoon warning issued for Okinawa", "Small", 10, "JP", "environment"));
        rows.add(story(31, "Shanghai opens a riverside park", "Other", 11, "CN", "society"));
        var selection = FrontRanker.select(rows, publishers, NOW);

        List<String> order = new ArrayList<>();
        selection.secondary().forEach(s -> order.add(s.publisher()));
        selection.rest().forEach(s -> order.add(s.publisher()));
        for (int i = 2; i < order.size(); i++) {
            String here = order.get(i);
            boolean threeInARow = here.equals(order.get(i - 1)) && here.equals(order.get(i - 2));
            boolean othersWaiting = order.subList(i, order.size()).stream().anyMatch(p -> !p.equals(here));
            assertThat(threeInARow && othersWaiting).as("three in a row at %d in %s", i, order).isFalse();
        }
        assertThat(order).contains("Small", "Other");
    }

    @Test
    void similarityNeedsMostWordsInCommon() {
        assertThat(FrontRanker.similar(FrontRanker.words("Rail strike halts commuter trains in Seoul"),
                FrontRanker.words("Rail strike halts commuter trains across Seoul"))).isTrue();
        assertThat(FrontRanker.similar(FrontRanker.words("Rail strike halts commuter trains in Seoul"),
                FrontRanker.words("Seoul opens a new commuter rail line"))).isFalse();
    }
}
