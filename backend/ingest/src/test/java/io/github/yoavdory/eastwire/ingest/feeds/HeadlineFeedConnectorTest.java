package io.github.yoavdory.eastwire.ingest.feeds;

import static org.assertj.core.api.Assertions.assertThat;

import io.github.yoavdory.eastwire.core.article.Location;
import io.github.yoavdory.eastwire.core.article.Location.Role;
import io.github.yoavdory.eastwire.core.config.ComplianceConfig;
import io.github.yoavdory.eastwire.core.config.RepoConfig;
import io.github.yoavdory.eastwire.core.config.SourceConfig;
import io.github.yoavdory.eastwire.core.geo.Gazetteer;
import io.github.yoavdory.eastwire.ingest.Connector;
import io.github.yoavdory.eastwire.ingest.http.FetchStateRepository;
import io.github.yoavdory.eastwire.ingest.http.HttpFetcher;
import io.github.yoavdory.eastwire.ingest.http.TestHttpServer;
import io.github.yoavdory.eastwire.ingest.http.TestHttpServer.Reply;
import io.github.yoavdory.eastwire.ingest.pipeline.ArticleCandidate;
import io.github.yoavdory.eastwire.ingest.pipeline.ArticleSink.WriteResult;
import io.github.yoavdory.eastwire.ingest.run.RunOutcome;
import java.io.IOException;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;

/** Invented feed items in the shapes the real Mainichi (RSS 1.0) and Sixth Tone (RSS 2.0) feeds use. */
class HeadlineFeedConnectorTest {

    private static final ComplianceConfig CONFIG = RepoConfig.load();
    private static final Instant NOW = Instant.parse("2026-10-15T09:00:00Z");

    /** RSS 1.0 with dc:date, served as text/html as Mainichi does. */
    private static final String RDF = """
            <?xml version="1.0" encoding="utf-8"?>
            <rdf:RDF xmlns="http://purl.org/rss/1.0/" xmlns:dc="http://purl.org/dc/elements/1.1/"
                     xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
              <channel rdf:about="https://example.test/"><title>Test</title><link>https://example.test/</link>
                <description>Test</description></channel>
              <item rdf:about="https://mainichi.jp/english/articles/20261015/p2g/00m/0na/001000c">
                <title>Ferry service resumes after typhoon closes port</title>
                <link>https://mainichi.jp/english/articles/20261015/p2g/00m/0na/001000c</link>
                <description>OSAKA (Kyodo) -- An invented summary used only to find the dateline.</description>
                <dc:date>2026-10-15T16:30:09+09:00</dc:date>
              </item>
              <item rdf:about="https://mainichi.jp/english/articles/20261015/p2g/00m/0sp/002000c">
                <title>Invented team wins a baseball game abroad</title>
                <link>https://mainichi.jp/english/articles/20261015/p2g/00m/0sp/002000c</link>
                <description>LOS ANGELES (AP) -- An invented summary with no covered place.</description>
                <dc:date>2026-10-15T16:10:12+09:00</dc:date>
              </item>
              <item rdf:about="https://mainichi.jp/english/articles/20261015/p2g/00m/0na/003000c">
                <title>Japan and India sign an invented research pact</title>
                <link>https://mainichi.jp/english/articles/20261015/p2g/00m/0na/003000c</link>
                <description>An invented summary without a dateline.</description>
                <dc:date>2026-10-15T15:00:00+09:00</dc:date>
              </item>
            </rdf:RDF>
            """;

    private static final String RSS2 = """
            <?xml version="1.0" encoding="UTF-8"?>
            <rss version="2.0"><channel><title>Test</title><link>https://example.test</link><description>Test</description>
              <item><title>Invented city opens late-night bus routes</title>
                <link>https://www.sixthtone.com/news/1000001/Invented City’s Late-Night Buses</link>
                <description>An invented summary.</description>
                <pubDate>Oct 14, 2026</pubDate><category>NEWS</category></item>
              <item><title>An invented essay on village life</title>
                <link>https://www.sixthtone.com/news/1000002</link>
                <description>An invented summary.</description>
                <pubDate>Tue, 13 Oct 2026 08:00:00 GMT</pubDate><category>FEATURES</category></item>
              <item><title>An invented item with no date at all</title>
                <link>https://www.sixthtone.com/news/1000003</link>
                <description>An invented summary.</description><category>NEWS</category></item>
            </channel></rss>
            """;

    private final TestHttpServer site = new TestHttpServer();
    private final List<ArticleCandidate> written = new ArrayList<>();
    private final HeadlineFeedConnector connector = new HeadlineFeedConnector(
            new HttpFetcher("test", Duration.ofSeconds(5), 2, Duration.ofMillis(1), Duration.ofSeconds(1), d -> { }),
            c -> {
                written.add(c);
                return WriteResult.created(written.size());
            },
            new NoFetchState(), CONFIG,
            new Gazetteer(CONFIG.cities(), CONFIG.activeCountries(), CONFIG.requiresCountryContext()));

    HeadlineFeedConnectorTest() throws IOException {
    }

    @AfterEach
    void stop() {
        site.close();
    }

    private Connector.Context context(String slug, String path) {
        SourceConfig local = CONFIG.source(slug).orElseThrow().withFeeds(List.of(site.uri(path).toString()));
        return new Connector.Context(local, (short) 9, null, NOW);
    }

    @Test
    void storesHeadlineLinkAndPublicationTimeOnlyAndSkipsItemsNotAboutCoveredCountries() {
        site.on("/rdf", Reply.ok(RDF, "text/html; charset=UTF-8"));

        RunOutcome outcome = connector.run(context("mainichi-english", "/rdf"));

        assertThat(outcome.status()).isEqualTo(RunOutcome.Status.SUCCESS);
        assertThat(outcome.details()).containsEntry("notAboutCoveredCountries", 1);
        assertThat(written).extracting(ArticleCandidate::title)
                .containsExactly("Ferry service resumes after typhoon closes port", "Japan and India sign an invented research pact");

        ArticleCandidate ferry = written.getFirst();
        assertThat(ferry.summary()).as("headline-only source: no summary is kept").isNull();
        assertThat(ferry.excerptKind()).isEqualTo(ArticleCandidate.ExcerptKind.NONE);
        assertThat(ferry.publishedAt()).isEqualTo(Instant.parse("2026-10-15T07:30:09Z"));
        assertThat(ferry.discoveredAt()).isEqualTo(NOW);
        assertThat(ferry.storyType()).isEqualTo(ArticleCandidate.StoryType.NEWS);
        // The dateline makes Osaka the main subject; the publisher's Tokyo base never is.
        assertThat(ferry.locations()).filteredOn(Location::primary).extracting(Location::role, Location::placeId)
                .containsExactly(org.assertj.core.groups.Tuple.tuple(Role.EVENT, 1853909L));
        assertThat(ferry.locations()).filteredOn(l -> l.role() == Role.PUBLISHER).singleElement()
                .satisfies(l -> assertThat(l.primary()).isFalse());

        ArticleCandidate pact = written.get(1);
        assertThat(pact.locations()).filteredOn(Location::primary).extracting(Location::countryIso2)
                .containsExactlyInAnyOrder("JP", "IN");
    }

    @Test
    void aSingleCountryPublicationFilesItsItemsThereAndSendsFeaturesToReading() {
        site.on("/rss", Reply.ok(RSS2, "application/xml;charset=utf-8"));

        connector.run(context("sixth-tone", "/rss"));

        assertThat(written).hasSize(2);
        assertThat(written).allSatisfy(c -> assertThat(c.locations()).filteredOn(Location::primary)
                .extracting(Location::countryIso2).containsExactly("CN"));
        assertThat(written).extracting(ArticleCandidate::storyType)
                .containsExactly(ArticleCandidate.StoryType.NEWS, ArticleCandidate.StoryType.FEATURE);
        // "Oct 14, 2026" is read as that day (Sixth Tone's format); an undated item is not stored.
        assertThat(written.getFirst().publishedAt()).isNotNull();
        assertThat(written.getFirst().publishedAt().toString()).startsWith("2026-10-1");
        // A raw space and curly quote in the feed's link are encoded, not a reason to drop the item.
        assertThat(written.getFirst().url())
                .isEqualTo("https://www.sixthtone.com/news/1000001/Invented%20City%E2%80%99s%20Late-Night%20Buses");
    }

    @Test
    void anHtmlPageInsteadOfAFeedFailsTheRun() {
        site.on("/rss", Reply.ok("<!DOCTYPE html><html><body>Checking your browser</body></html>", "text/html"));

        RunOutcome outcome = connector.run(context("sixth-tone", "/rss"));

        assertThat(outcome.status()).isEqualTo(RunOutcome.Status.FAILED);
        assertThat(written).isEmpty();
    }

    /** No conditional-GET state: every request is a full fetch. */
    private static final class NoFetchState extends FetchStateRepository {
        private final Map<String, FetchState> saved = new HashMap<>();

        NoFetchState() {
            super(null);
        }

        @Override
        public Optional<FetchState> get(String url) {
            return Optional.ofNullable(saved.get(url));
        }

        @Override
        public void save(String url, String etag, String lastModified, int status, Instant at) {
        }
    }
}
