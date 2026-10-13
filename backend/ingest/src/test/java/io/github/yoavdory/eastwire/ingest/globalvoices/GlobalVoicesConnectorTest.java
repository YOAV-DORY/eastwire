package io.github.yoavdory.eastwire.ingest.globalvoices;

import static org.assertj.core.api.Assertions.assertThat;

import io.github.yoavdory.eastwire.core.article.Location;
import io.github.yoavdory.eastwire.core.article.Location.Method;
import io.github.yoavdory.eastwire.core.article.Location.Precision;
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
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;

class GlobalVoicesConnectorTest {

    private static final ComplianceConfig CONFIG = RepoConfig.load();
    private static final Instant NOW = Instant.parse("2026-10-13T12:00:00Z");

    private final TestHttpServer site = new TestHttpServer();
    private final List<ArticleCandidate> written = new ArrayList<>();
    private final InMemoryFetchState fetchState = new InMemoryFetchState();
    private final GlobalVoicesConnector connector = new GlobalVoicesConnector(
            new HttpFetcher("test", Duration.ofSeconds(5), 2, Duration.ofMillis(1), Duration.ofSeconds(1), d -> { }),
            c -> {
                written.add(c);
                return WriteResult.created(written.size());
            },
            fetchState, CONFIG,
            new Gazetteer(CONFIG.cities(), CONFIG.activeCountries(), CONFIG.requiresCountryContext()));

    GlobalVoicesConnectorTest() throws IOException {
    }

    @AfterEach
    void stop() {
        site.close();
    }

    /** The real Global Voices source config, pointed at the local test server. */
    private Connector.Context context(String... paths) {
        List<String> feeds = java.util.Arrays.stream(paths).map(p -> site.uri(p).toString()).toList();
        SourceConfig local = CONFIG.source("global-voices").orElseThrow().withFeeds(feeds);
        return new Connector.Context(local, (short) 2, null, NOW);
    }

    private static String fixture() throws IOException {
        try (InputStream in = GlobalVoicesConnectorTest.class.getResourceAsStream("/fixtures/globalvoices-feed.xml")) {
            return new String(in.readAllBytes(), StandardCharsets.UTF_8);
        }
    }

    @Test
    void mapsCoveredItemsWithCountryCityDatelineAndLicenseBasis() throws IOException {
        site.on("/feed", Reply.ok(fixture(), "application/rss+xml; charset=UTF-8").withHeader("ETag", "\"v1\""));

        RunOutcome outcome = connector.run(context("/feed"));

        assertThat(outcome.status()).isEqualTo(RunOutcome.Status.SUCCESS);
        assertThat(outcome.details()).containsEntry("notAboutCoveredCountries", 1);
        assertThat(written).hasSize(2);

        ArticleCandidate busan = written.getFirst();
        assertThat(busan.title()).isEqualTo("Neighbourhood libraries in Busan stay open late");
        assertThat(busan.author()).isEqualTo("Test Author");
        assertThat(busan.excerptKind()).isEqualTo(ArticleCandidate.ExcerptKind.CC_BY_EXCERPT);
        assertThat(busan.partnerReprint()).isFalse();
        assertThat(busan.publishedAt()).isEqualTo(Instant.parse("2026-10-01T08:00:00Z"));
        assertThat(busan.locations()).extracting(Location::role, Location::precision, Location::method)
                .containsExactly(
                        org.assertj.core.groups.Tuple.tuple(Role.MENTIONED, Precision.COUNTRY, Method.FEED_CATEGORY),
                        org.assertj.core.groups.Tuple.tuple(Role.MENTIONED, Precision.CITY, Method.GAZETTEER),
                        org.assertj.core.groups.Tuple.tuple(Role.EVENT, Precision.CITY, Method.DATELINE));
        // "Busan" in the headline is a mention; "SEOUL —" opening the summary is a dateline (event).
        assertThat(busan.locations().get(1).evidence()).isEqualTo("Mentions Busan");
        assertThat(busan.locations().get(2).evidence()).isEqualTo("Dateline: Seoul");
    }

    @Test
    void flagsPartnerReprintsAndDecodesEntities() throws IOException {
        site.on("/feed", Reply.ok(fixture(), "application/rss+xml"));
        connector.run(context("/feed"));

        ArticleCandidate seeds = written.get(1);
        assertThat(seeds.title()).isEqualTo("Farmers’ cooperatives test new seed bank");
        assertThat(seeds.partnerReprint()).isTrue();
        assertThat(seeds.locations()).extracting(Location::evidence).contains("Mentions Pune");
    }

    @Test
    void sendsConditionalHeadersAndSkipsUnchangedFeeds() {
        fetchState.state.put(site.uri("/feed").toString(), new FetchStateRepository.FetchState("\"v1\"", null));
        site.on("/feed", Reply.status(304));

        RunOutcome outcome = connector.run(context("/feed"));

        assertThat(site.requests().getFirst().header("If-None-Match")).isEqualTo("\"v1\"");
        assertThat(outcome.status()).isEqualTo(RunOutcome.Status.SUCCESS);
        assertThat(outcome.details()).containsEntry("feedsNotModified", 1);
        assertThat(written).isEmpty();
    }

    @Test
    void oneBrokenFeedMakesTheRunPartialAndAnHtmlChallengeIsNotParsed() throws IOException {
        site.on("/good", Reply.ok(fixture(), "application/rss+xml"));
        site.on("/challenge", Reply.ok("<!DOCTYPE html><html><title>Just a moment...</title></html>", "text/html"));

        RunOutcome outcome = connector.run(context("/good", "/challenge"));

        assertThat(outcome.status()).isEqualTo(RunOutcome.Status.PARTIAL);
        assertThat(outcome.errorMessage()).contains("HTML page");
        assertThat(written).hasSize(2);
    }

    @Test
    void aStrayControlCharacterInOnePostDoesNotBreakTheFeed() throws IOException {
        site.on("/feed", Reply.ok(fixture().replace("Volunteers say", "Volunteers\u0008 say"), "application/rss+xml"));

        RunOutcome outcome = connector.run(context("/feed"));

        assertThat(outcome.status()).isEqualTo(RunOutcome.Status.SUCCESS);
        assertThat(written).hasSize(2);
        assertThat(written.getFirst().summary()).startsWith("SEOUL — Volunteers say");
    }

    @Test
    void stopsCallingTheSiteAfterTwoNetworkFailuresInARow() {
        site.on("/a", Reply.status(503));
        site.on("/b", Reply.status(502));
        site.on("/c", Reply.ok("never fetched", "application/rss+xml"));

        RunOutcome outcome = connector.run(context("/a", "/b", "/c"));

        assertThat(outcome.status()).isEqualTo(RunOutcome.Status.FAILED);
        assertThat(outcome.details()).containsEntry("feedsSkippedHostDown", 1);
        assertThat(site.count("/c")).isZero();
    }

    @Test
    void allFeedsFailingFailsTheRun() {
        site.on("/a", Reply.status(500));
        site.on("/b", Reply.ok("<rss><channel><item>", "application/rss+xml"));

        RunOutcome outcome = connector.run(context("/a", "/b"));

        assertThat(outcome.status()).isEqualTo(RunOutcome.Status.FAILED);
    }

    /** Fetch state kept in memory instead of the database. */
    static final class InMemoryFetchState extends FetchStateRepository {
        final Map<String, FetchState> state = new HashMap<>();

        InMemoryFetchState() {
            super(null);
        }

        @Override
        public Optional<FetchState> get(String url) {
            return Optional.ofNullable(state.get(url));
        }

        @Override
        public void save(String url, String etag, String lastModified, int status, Instant now) {
            state.put(url, new FetchState(etag, lastModified));
        }
    }
}
