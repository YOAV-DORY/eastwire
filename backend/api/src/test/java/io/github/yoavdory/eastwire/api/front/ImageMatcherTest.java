package io.github.yoavdory.eastwire.api.front;

import static org.assertj.core.api.Assertions.assertThat;

import io.github.yoavdory.eastwire.api.articles.ArticleRow;
import io.github.yoavdory.eastwire.api.articles.ArticleRow.LocationRow;
import io.github.yoavdory.eastwire.api.articles.ArticleRow.SectorRow;
import io.github.yoavdory.eastwire.core.config.ImageCatalog;
import java.nio.file.Path;
import java.time.Instant;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import org.junit.jupiter.api.Test;

/** The repository's own config/images.yaml, matched against invented stories. */
class ImageMatcherTest {

    private static final ImageCatalog CATALOG = ImageCatalog.load(Path.of(System.getProperty("eastwire.config-dir", "../config")));
    private final ImageMatcher matcher = new ImageMatcher(CATALOG);
    private static final Instant T = Instant.parse("2026-10-15T09:00:00Z");

    private static ArticleRow row(String title, List<LocationRow> places, String sector) {
        return new ArticleRow(1, "test", title, "https://example.test/1", "example.test", null, null, null, null, null, null,
                T, T, 1, places, sector == null ? List.of() : List.of(new SectorRow(sector, 4, "[]")), null, "news", T);
    }

    private static LocationRow city(long id, String name, String country, String method) {
        return new LocationRow("dateline".equals(method) ? "event" : "mentioned", "city", "high", method, country, id, name, "x", true);
    }

    private static LocationRow country(String iso) {
        return new LocationRow("mentioned", "country", "high", "gazetteer", iso, null, null, "x", true);
    }

    @Test
    void aCityImageWhenTheHeadlineOrDatelineNamesTheCity() {
        var named = row("Osaka ferry service resumes after typhoon", List.of(city(1853909, "Osaka", "JP", "gazetteer")), null);
        var datelined = row("Ferry service resumes after typhoon", List.of(city(1853909, "Osaka", "JP", "dateline")), null);
        var onlyInText = row("Ferry service resumes after typhoon", List.of(city(1853909, "Osaka", "JP", "gdelt_gkg")), null);

        assertThat(matcher.match(named, Set.of())).map(ImageCatalog.Image::id).contains("osaka-dotonbori");
        assertThat(matcher.match(datelined, Set.of())).map(ImageCatalog.Image::id).contains("osaka-dotonbori");
        assertThat(matcher.match(onlyInText, Set.of())).isEmpty();
    }

    @Test
    void aTopicImageOnlyWhenTheHeadlineIsOnItsTopic() {
        var markets = row("Sensex falls as foreign investors sell shares", List.of(country("IN")), "economy");
        var worldBank = row("World Bank lends $36 bn for roads", List.of(country("IN")), "economy");
        var army = row("Army history: a hero remembered", List.of(country("IN")), "geopolitics");

        assertThat(matcher.match(markets, Set.of())).map(ImageCatalog.Image::id).contains("india-stock-exchange");
        assertThat(matcher.match(worldBank, Set.of())).isEmpty();
        assertThat(matcher.match(army, Set.of())).isEmpty();
    }

    @Test
    void noImageForAStoryAboutACountryWeDoNotCoverEvenWithACoveredDateline() {
        var nk = row("North Korea says it test-fired cruise missiles", List.of(city(1816670, "Beijing", "CN", "dateline")), "geopolitics");
        // No Beijing photo on a North Korea story, even though it may now lead as Korean Peninsula security news.
        assertThat(matcher.match(nk, Set.of())).isEmpty();
        assertThat(FrontRanker.score(nk, "The Mainichi", T).eligible()).isTrue();
        assertThat(FrontRanker.score(nk, "The Mainichi", T).country()).isEqualTo("KR");
    }

    @Test
    void neverTheSameImageTwiceOnOnePage() {
        var first = row("Tokyo opens a new library", List.of(city(1850147, "Tokyo", "JP", "gazetteer")), null);
        var second = row("Tokyo extends late trains", List.of(city(1850147, "Tokyo", "JP", "gazetteer")), null);
        Set<String> used = new HashSet<>();
        matcher.match(first, used).ifPresent(i -> used.add(i.id()));
        assertThat(used).containsExactly("tokyo-marunouchi");
        assertThat(matcher.match(second, used)).isEmpty();
    }

    @Test
    void imagesCarryEverythingNeededToCreditThem() {
        var view = ImageMatcher.view(CATALOG.images().getFirst());
        assertThat(view.illustrative()).isTrue();
        assertThat(view.creator()).isNotBlank();
        assertThat(view.license()).isNotBlank();
        assertThat(view.filePage()).startsWith("https://commons.wikimedia.org/wiki/File:");
        assertThat(view.srcSet()).contains("500w", "960w", "1920w");
        assertThat(view.alt()).isNotBlank();
    }
}
