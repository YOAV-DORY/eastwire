package io.github.yoavdory.eastwire.ingest.pipeline;

import static org.assertj.core.api.Assertions.assertThat;

import io.github.yoavdory.eastwire.core.article.Location;
import io.github.yoavdory.eastwire.core.article.Location.Confidence;
import io.github.yoavdory.eastwire.core.article.Location.Method;
import io.github.yoavdory.eastwire.core.article.Location.Precision;
import io.github.yoavdory.eastwire.core.article.Location.Role;
import io.github.yoavdory.eastwire.core.article.UrlCanonicalizer;
import io.github.yoavdory.eastwire.core.sector.SectorSignals;
import io.github.yoavdory.eastwire.ingest.PostgresTestBase;
import io.github.yoavdory.eastwire.ingest.pipeline.ArticleCandidate.ExcerptKind;
import io.github.yoavdory.eastwire.ingest.pipeline.ArticleSink.WriteResult.Kind;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

class ArticleWriterIntegrationTest extends PostgresTestBase {

    private static final String LONG_SUMMARY = "SEOUL — First sentence about libraries. Second sentence adds detail. "
            + "Third sentence keeps going so that the summary is clearly longer than the three hundred characters "
            + "that Global Voices excerpts are allowed to use on a card, which means it has to be shortened at a "
            + "sentence boundary before it is stored. Fourth sentence. Fifth sentence. Sixth sentence for length.";

    @Autowired
    ArticleWriter writer;

    @Autowired
    RetentionPurger purger;

    @Autowired
    SectorTagger tagger;

    private static Location seoulEvent() {
        return new Location(1835848L, "KR", Role.EVENT, Precision.CITY, Confidence.HIGH, Method.DATELINE, "Dateline: Seoul");
    }

    private static Location koreaFiled() {
        return new Location(null, "KR", Role.MENTIONED, Precision.COUNTRY, Confidence.HIGH, Method.FEED_CATEGORY,
                "Filed under South Korea by Global Voices");
    }

    private static ArticleCandidate globalVoices(String url, Instant published) {
        return new ArticleCandidate("global-voices", url, "Libraries stay open late", LONG_SUMMARY, "Test Author", null,
                false, ExcerptKind.CC_BY_EXCERPT, published, Instant.now(), "en", List.of(koreaFiled(), seoulEvent()),
                SectorSignals.categories(Set.of("South Korea", "Education")));
    }

    private static ArticleCandidate gdelt(String url, String title) {
        return new ArticleCandidate("gdelt-gkg", url, title, null, null, null, false, ExcerptKind.NONE, null,
                Instant.now().minusSeconds(600), "en",
                List.of(new Location(null, "JP", Role.MENTIONED, Precision.COUNTRY, Confidence.MEDIUM, Method.GDELT_GKG,
                        "Mentions Japan")), SectorSignals.themes(Set.of("ECON_INFLATION")));
    }

    @Test
    void storesALicensedExcerptWithAttributionAndLocations() {
        ArticleSink.WriteResult result = writer.write(globalVoices(
                "https://globalvoices.org/2026/10/01/libraries/?utm_source=rss", Instant.now().minus(Duration.ofDays(1))));

        assertThat(result.kind()).isEqualTo(Kind.NEW);
        Map<String, Object> row = jdbc.sql("""
                SELECT canonical_url, excerpt, excerpt_kind, display_mode, license_name, attribution
                FROM article WHERE id = :id""").param("id", result.articleId()).query().singleRow();
        assertThat(row.get("canonical_url")).isEqualTo("https://globalvoices.org/2026/10/01/libraries/");
        assertThat((String) row.get("excerpt")).hasSizeLessThanOrEqualTo(300).endsWith(".");
        assertThat(row).containsEntry("excerpt_kind", "cc_by_excerpt").containsEntry("display_mode", "headline_excerpt")
                .containsEntry("license_name", "CC BY 3.0")
                .containsEntry("attribution", "By Test Author, Global Voices · CC BY 3.0 · excerpt, shortened");
        assertThat(count("SELECT count(*) FROM article_location WHERE article_id = " + result.articleId())).isEqualTo(2);
    }

    @Test
    void tagsSectorsWithTheRulesThatMatched() {
        long gv = writer.write(globalVoices("https://globalvoices.org/2026/10/01/libraries/", Instant.now().minus(Duration.ofDays(1))))
                .articleId();
        long gd = writer.write(gdelt("https://mainichi.jp/english/articles/20261013/inflation", "Inflation eases in Japan"))
                .articleId();

        assertThat(sectors(gv)).containsExactly("society");   // Global Voices filed it under Education
        assertThat(sectors(gd)).containsExactly("economy");
        String rules = jdbc.sql("SELECT matched_rules::text FROM article_sector WHERE article_id = :id")
                .param("id", gd).query(String.class).single();
        assertThat(rules).contains("\"value\": \"inflation\"", "\"field\": \"headline\"", "\"value\": \"ECON_INFLATION\"");
        assertThat(jdbc.sql("SELECT sector_signals::text FROM article WHERE id = :id").param("id", gd).query(String.class).single())
                .contains("ECON_INFLATION");
    }

    @Test
    void retagsArticlesTaggedByOlderRules() {
        long id = writer.write(gdelt("https://mainichi.jp/english/articles/20261013/rates", "Inflation eases in Japan")).articleId();
        jdbc.sql("UPDATE article SET sector_rules_version = 'old' WHERE id = :id").param("id", id).update();
        jdbc.sql("DELETE FROM article_sector WHERE article_id = :id").param("id", id).update();

        assertThat(tagger.retagStale()).isEqualTo(1);
        assertThat(sectors(id)).containsExactly("economy");
        assertThat(tagger.retagStale()).isZero();   // stored signals were reused, version is current again
    }

    private List<String> sectors(long articleId) {
        return jdbc.sql("SELECT sector FROM article_sector WHERE article_id = :id ORDER BY score DESC")
                .param("id", articleId).query(String.class).list();
    }

    @Test
    void theSameArticleUnderAnotherUrlVariantIsADuplicate() {
        Instant published = Instant.now().minus(Duration.ofDays(1));
        writer.write(globalVoices("https://globalvoices.org/2026/10/01/libraries/", published));
        ArticleSink.WriteResult again = writer.write(
                globalVoices("http://www.globalvoices.org/2026/10/01/libraries?utm_campaign=x#top", published));
        assertThat(again.kind()).isEqualTo(Kind.DUPLICATE);
        assertThat(count("SELECT count(*) FROM article")).isEqualTo(1);
    }

    @Test
    void discoveredItemsAreHeadlineOnly() {
        ArticleSink.WriteResult result = writer.write(gdelt("https://mainichi.jp/english/articles/1", "Rail line reopens"));
        assertThat(result.kind()).isEqualTo(Kind.NEW);
        assertThat(jdbc.sql("SELECT display_mode FROM article").query(String.class).single()).isEqualTo("headline_only");
        assertThat(count("SELECT count(*) FROM article WHERE excerpt IS NOT NULL")).isZero();
    }

    @Test
    void deniedTakenDownAndExpiredItemsAreNotStored() {
        assertThat(writer.write(gdelt("https://www.scmp.com/news/1", "Denied")).kind()).isEqualTo(Kind.HIDDEN);

        String takenDown = "https://scroll.in/article/99/taken-down";
        jdbc.sql("INSERT INTO suppression (url_hash, reason) VALUES (:h, 'test takedown')")
                .param("h", UrlCanonicalizer.hash(takenDown)).update();
        assertThat(writer.write(gdelt(takenDown, "Taken down")).kind()).isEqualTo(Kind.SUPPRESSED);

        assertThat(writer.write(globalVoices("https://globalvoices.org/2025/01/01/old/",
                Instant.now().minus(Duration.ofDays(120)))).kind()).isEqualTo(Kind.TOO_OLD);

        assertThat(count("SELECT count(*) FROM article")).isZero();
    }

    @Test
    void nearIdenticalHeadlinesFormOneStoryCluster() {
        long a = writer.write(gdelt("https://mainichi.jp/english/articles/a", "Typhoon Mawar makes landfall in Okinawa")).articleId();
        long b = writer.write(gdelt("https://www.asahi.com/ajw/articles/b", "Typhoon Mawar makes landfall in Okinawa, Japan")).articleId();
        long c = writer.write(gdelt("https://scroll.in/article/c", "Typhoon Mawar makes landfall over Okinawa")).articleId();
        long unrelated = writer.write(gdelt("https://www.sixthtone.com/news/d", "City opens new public library")).articleId();

        Long clusterA = jdbc.sql("SELECT cluster_id FROM article WHERE id = :id").param("id", a).query(Long.class).single();
        assertThat(clusterA).isNotNull();
        assertThat(jdbc.sql("SELECT cluster_id FROM article WHERE id IN (:ids)").param("ids", List.of(b, c))
                .query(Long.class).list()).containsOnly(clusterA);
        assertThat(jdbc.sql("SELECT size FROM story_cluster WHERE id = :id").param("id", clusterA).query(Integer.class).single())
                .isEqualTo(3);
        assertThat(jdbc.sql("SELECT cluster_id FROM article WHERE id = :id").param("id", unrelated)
                .query(Long.class).optional()).isEmpty();
    }

    @Test
    void purgeRemovesExpiredAndTakenDownArticlesAndTidiesClusters() {
        long a = writer.write(gdelt("https://mainichi.jp/english/articles/x1", "Port strike enters third day")).articleId();
        writer.write(gdelt("https://www.asahi.com/ajw/articles/x2", "Port strike enters its third day"));
        jdbc.sql("UPDATE article SET expires_at = now() - interval '1 minute' WHERE id = :id").param("id", a).update();

        RetentionPurger.Result result = purger.purge();

        assertThat(result.expired()).isEqualTo(1);
        assertThat(count("SELECT count(*) FROM article")).isEqualTo(1);
        assertThat(count("SELECT coalesce(max(size), 0) FROM story_cluster")).isEqualTo(1);
    }
}
