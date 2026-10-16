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
        assertThat(today.score() - yesterday.score()).isCloseTo(1.0, org.assertj.core.data.Offset.offset(0.01));
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
        assertThat(FrontRanker.score(a, "A", NOW).why()).contains("Reported by 2 outlets");
    }

    @Test
    void secondaryStoriesPreferOtherPublishersAndCountries() {
        var lead = story(1, "Japan and the US agree on chip export controls", "A", 1, "JP", "geopolitics");
        var sameEverything = story(2, "Japan cabinet holds its regular weekly meeting", "A", 1, "JP", "geopolitics");
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
    void importanceBeatsNewnessForTheLead() {
        // The case from the review: a minor company item led while bigger stories waited.
        var minor = story(1, "Mizuho to train sales, office staff as AI engineers in 3 months", "A", 0.5, "JP", "technology");
        var market = story(2, "Nikkei marks 3rd largest single-day point drop on AI, chip concerns", "B", 6, "JP", "economy");
        var missile = story(3, "North Korea says it test-fired submarine-launched cruise missiles", "C", 5, null, "geopolitics");
        var selection = FrontRanker.select(List.of(minor, market, missile), publishers, NOW);

        assertThat(selection.lead().row().id()).isIn(2L, 3L);
        assertThat(selection.secondary()).extracting(s -> s.row().id()).contains(selection.lead().row().id() == 2L ? 3L : 2L);
        assertThat(FrontRanker.score(minor, "A", NOW).why()).contains("Company news, ranked lower");
        assertThat(FrontRanker.score(market, "B", NOW).why()).contains("Market move");
        var missileScore = FrontRanker.score(missile, "C", NOW);
        assertThat(missileScore.why()).contains("Security", "Korean Peninsula security");
        assertThat(missileScore.country()).isEqualTo("KR");
        assertThat(missileScore.eligible()).isTrue();
    }

    @Test
    void opinionNeverLeads() {
        var column = new ArticleRow(1, "test", "The world beyond war and peace",
                "https://www.business-standard.com/opinion/columns/the-world-beyond-war-and-peace-1.html", "business-standard.com",
                null, null, null, null, null, null, NOW, NOW, 1,
                List.of(new LocationRow("mentioned", "country", "high", "gazetteer", "IN", null, null, "x", true)),
                List.of(new SectorRow("geopolitics", 4, "[]")));
        publishers.put(1L, "Business Standard");
        var news = story(2, "City council approves a new metro line", "B", 6, "IN", "society");
        var selection = FrontRanker.select(List.of(column, news), publishers, NOW);
        assertThat(selection.lead().row().id()).isEqualTo(2);
        assertThat(FrontRanker.score(column, "Business Standard", NOW).why()).contains("Opinion or review, ranked lower");
        // A book review from the same publisher's /book/ section, as seen on 2026-10-16.
        assertThat(FrontRanker.OPINION.matcher("https://www.business-standard.com/book/the-world-beyond-war-and-peace-1.html").find())
                .isTrue();
    }

    @Test
    void impactWordsNeedTheirContext() {
        assertThat(FrontRanker.SECURITY.matcher("China urges Japan to face history over war criminals").find()).isFalse();
        assertThat(FrontRanker.SECURITY.matcher("Navy hospital ship arrives on a medical mission").find()).isFalse();
        assertThat(FrontRanker.SECURITY.matcher("Japan scrambles fighter jets as Chinese warships pass").find()).isTrue();
        assertThat(FrontRanker.MARKET_MOVE.matcher("IT, private banks lift Nifty 1.7% as Asian AI stocks tumble").find()).isFalse();
        assertThat(FrontRanker.MARKET_MOVE.matcher("Nikkei marks 3rd largest single-day point drop on AI, chip concerns").find()).isTrue();
        assertThat(FrontRanker.MARKET_MOVE.matcher("Kospi hits record high as chip stocks rally").find()).isTrue();
    }

    @Test
    void storiesCoveredByMoreOutletsRankHigher() {
        var single = FrontRanker.score(story(1, "Port expansion approved", "A", 2, "KR", "economy"), "A", NOW);
        var widely = FrontRanker.score(story(2, "Port expansion approved", "A", 2, "KR", "economy", 9L, 4, true), "A", NOW);
        assertThat(widely.score() - single.score()).isCloseTo(1.8, org.assertj.core.data.Offset.offset(0.01));
    }

    @Test
    void theLeadAvoidsThePreviousLeadsCountryWhenAnotherStoryIsClose() {
        var japan = story(1, "Japan and the US agree on chip export controls", "A", 1, "JP", "geopolitics");
        var korea = story(2, "South Korea and the US hold talks on chip export controls", "B", 2, "KR", "geopolitics");
        assertThat(FrontRanker.select(List.of(japan, korea), publishers, NOW, null).lead().row().id()).isEqualTo(1);
        assertThat(FrontRanker.select(List.of(japan, korea), publishers, NOW, "JP").lead().row().id()).isEqualTo(2);
        // With nothing else eligible, the same country may lead again.
        assertThat(FrontRanker.select(List.of(japan), publishers, NOW, "JP").lead().row().id()).isEqualTo(1);
    }

    @Test
    void noCountryOrPublisherDominatesTheOrderWhileOthersWait() {
        List<ArticleRow> rows = new ArrayList<>();
        for (int i = 0; i < 12; i++) {
            rows.add(story(100 + i, "India story " + i + " on " + (char) ('a' + i) + " affairs", i % 2 == 0 ? "BigWire" : "OtherIndia",
                    0.1 * i, "IN", "economy"));
        }
        for (int i = 0; i < 4; i++) {
            rows.add(story(200 + i, "Japan item " + i + " about " + (char) ('m' + i) + " matters", "JapanDaily", 8 + i, "JP", "society"));
            rows.add(story(300 + i, "China item " + i + " about " + (char) ('q' + i) + " issues", "ChinaPaper", 9 + i, "CN", "society"));
            rows.add(story(400 + i, "Korea item " + i + " about " + (char) ('u' + i) + " plans", "KoreaWire", 10 + i, "KR", "society"));
        }
        List<FrontRanker.Scored> order = FrontRanker.balance(rows.stream()
                .map(r -> FrontRanker.score(r, publishers.get(r.id()), NOW))
                .sorted(java.util.Comparator.comparingDouble(FrontRanker.Scored::score).reversed())
                .toList());
        // In the first 15 (what a reader sees), India holds at most 40% and BigWire at most 25%.
        List<FrontRanker.Scored> top = order.subList(0, 15);
        assertThat(top.stream().filter(s -> s.country().equals("IN")).count()).isLessThanOrEqualTo(6);
        assertThat(top.stream().filter(s -> s.publisher().equals("BigWire")).count()).isLessThanOrEqualTo(4);
        // Nothing is dropped.
        assertThat(order).hasSize(rows.size());
    }

    @Test
    void similarityNeedsMostWordsInCommon() {
        assertThat(FrontRanker.similar(FrontRanker.words("Rail strike halts commuter trains in Seoul"),
                FrontRanker.words("Rail strike halts commuter trains across Seoul"))).isTrue();
        assertThat(FrontRanker.similar(FrontRanker.words("Rail strike halts commuter trains in Seoul"),
                FrontRanker.words("Seoul opens a new commuter rail line"))).isFalse();
    }
}
