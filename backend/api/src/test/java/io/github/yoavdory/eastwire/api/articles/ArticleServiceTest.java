package io.github.yoavdory.eastwire.api.articles;

import static org.assertj.core.api.Assertions.assertThat;

import io.github.yoavdory.eastwire.api.articles.ArticleRow.LocationRow;
import io.github.yoavdory.eastwire.core.config.ComplianceConfig;
import io.github.yoavdory.eastwire.core.config.RepoConfig;
import io.github.yoavdory.eastwire.core.policy.DisplayPolicy;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import org.junit.jupiter.api.Test;

class ArticleServiceTest {

    private static final ComplianceConfig CONFIG = RepoConfig.load();
    private static final Instant NOW = Instant.parse("2026-10-13T12:00:00Z");

    private static ArticleRow row(long id, String source, String url, String excerpt, Instant discovered, int clusterSize) {
        return new ArticleRow(id, source, "Headline " + id, url, url.replaceFirst("https://(www\\.)?", "").replaceFirst("/.*", ""),
                excerpt, "A. Writer", null,
                excerpt == null ? "Data: The GDELT Project (gdeltproject.org)" : "By A. Writer, Global Voices · CC BY 3.0 · excerpt, shortened",
                excerpt == null ? null : "CC BY 3.0", excerpt == null ? null : "https://creativecommons.org/licenses/by/3.0/",
                null, discovered, clusterSize,
                List.of(new LocationRow("mentioned", "city", "medium", "gazetteer", "JP", 1850147L, "Tokyo", "Mentions Tokyo")),
                List.of());
    }

    private static ArticleService service(List<ArticleRow> rows) {
        ArticleRepository repo = new ArticleRepository() {
            @Override
            public List<ArticleRow> find(ArticleQuery query) {
                return rows;
            }

            @Override
            public long count(ArticleQuery query) {
                return rows.size();
            }
        };
        return new ArticleService(repo, new DisplayPolicy(CONFIG), CONFIG, Clock.fixed(NOW, ZoneOffset.UTC));
    }

    private static final ArticleQuery FIRST_PAGE = new ArticleQuery(null, null, null, null, 1, 20);

    @Test
    void discoveredItemsShowThePublisherNameAndViaGdelt() {
        ArticleView v = service(List.of(row(1, "gdelt-gkg", "https://scroll.in/article/1/x", null, NOW.minusSeconds(600), 3)))
                .page(FIRST_PAGE).items().getFirst();
        assertThat(v.publisher()).isEqualTo("Scroll.in");
        assertThat(v.viaDiscovery()).isTrue();
        assertThat(v.isNew()).isTrue();
        assertThat(v.alsoReportedBy()).isEqualTo(2);
        assertThat(v.excerpt()).isNull();
        assertThat(v.locations()).singleElement().extracting(ArticleView.LocationView::placeName).isEqualTo("Tokyo");
    }

    @Test
    void aPublisherDeniedAfterIngestionDisappearsAtReadTime() {
        ArticleView.Page page = service(List.of(
                        row(1, "gdelt-gkg", "https://www.scmp.com/news/1", null, NOW, 1),
                        row(2, "gdelt-gkg", "https://unreviewed.example/x", null, NOW, 1),
                        row(3, "global-voices", "https://globalvoices.org/2026/10/01/x/", "An excerpt.", NOW, 1)))
                .page(FIRST_PAGE);
        assertThat(page.items()).extracting(ArticleView::id).containsExactly(3L);
    }

    @Test
    void licensedExcerptsKeepTheirCreditAndLicense() {
        ArticleView v = service(List.of(row(5, "global-voices", "https://globalvoices.org/2026/10/01/x/",
                "One sentence. Two sentences.", NOW.minusSeconds(7200), 1))).page(FIRST_PAGE).items().getFirst();
        assertThat(v.excerpt()).isEqualTo("One sentence. Two sentences.");
        assertThat(v.attribution()).isEqualTo("By A. Writer, Global Voices · CC BY 3.0 · excerpt, shortened");
        assertThat(v.license().name()).isEqualTo("CC BY 3.0");
        assertThat(v.isNew()).isFalse();
        assertThat(v.viaDiscovery()).isFalse();
        assertThat(v.publisher()).isEqualTo("Global Voices");
    }

    @Test
    void excerptsAreCutToTheLimitThatAppliesNow() {
        String long_ = "First sentence. ".repeat(40);
        ArticleView v = service(List.of(row(6, "global-voices", "https://globalvoices.org/2026/10/01/y/", long_, NOW, 1)))
                .page(FIRST_PAGE).items().getFirst();
        assertThat(v.excerpt()).hasSizeLessThanOrEqualTo(300);
    }
}
