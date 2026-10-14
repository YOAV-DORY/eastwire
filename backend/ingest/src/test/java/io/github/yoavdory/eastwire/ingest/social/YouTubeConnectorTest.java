package io.github.yoavdory.eastwire.ingest.social;

import static org.assertj.core.api.Assertions.assertThat;

import io.github.yoavdory.eastwire.core.config.ComplianceConfig;
import io.github.yoavdory.eastwire.core.config.RepoConfig;
import io.github.yoavdory.eastwire.core.geo.Gazetteer;
import io.github.yoavdory.eastwire.core.social.SocialAccount;
import io.github.yoavdory.eastwire.core.social.SocialAccount.Kind;
import io.github.yoavdory.eastwire.core.social.SocialAccount.Platform;
import io.github.yoavdory.eastwire.core.social.SocialAccount.Scope;
import io.github.yoavdory.eastwire.core.social.SocialAccounts;
import io.github.yoavdory.eastwire.ingest.Connector;
import io.github.yoavdory.eastwire.ingest.http.HttpFetcher;
import io.github.yoavdory.eastwire.ingest.http.TestHttpServer;
import io.github.yoavdory.eastwire.ingest.http.TestHttpServer.Reply;
import io.github.yoavdory.eastwire.ingest.run.RunOutcome;
import io.github.yoavdory.eastwire.ingest.social.youtube.YouTubeConnector;
import java.io.IOException;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;

/** Invented channel and videos. */
class YouTubeConnectorTest {

    private static final ComplianceConfig CONFIG = RepoConfig.load();
    private static final Instant NOW = Instant.parse("2026-10-14T12:00:00Z");
    private static final String CHANNEL = "UCabcdefghijklmnopqrstuv";

    private final TestHttpServer api = new TestHttpServer();
    private final InMemorySocialStore store = new InMemorySocialStore(Map.of(CHANNEL, 7L));

    YouTubeConnectorTest() throws IOException {
    }

    @AfterEach
    void stop() {
        api.close();
    }

    private YouTubeConnector connector(String key) {
        SocialAccount channel = new SocialAccount(Platform.YOUTUBE, CHANNEL, "@desk", "Desk", Kind.NEWSROOM, "desk.example",
                Scope.ALL, "Test", "https://www.youtube.com/@desk", LocalDate.of(2026, 10, 14));
        return new YouTubeConnector(
                new HttpFetcher("test", Duration.ofSeconds(5), 2, Duration.ofMillis(1), Duration.ofSeconds(1), d -> { }),
                api.uri("/youtube/v3/").toString(), key, new SocialAccounts(List.of(channel)), store,
                new SocialPlaces(CONFIG, new Gazetteer(CONFIG.cities(), CONFIG.activeCountries(), CONFIG.requiresCountryContext())));
    }

    private static Connector.Context context() {
        return new Connector.Context(CONFIG.source(YouTubeConnector.SLUG).orElseThrow(), (short) 2, null, NOW);
    }

    private static String video(String id, String title, String published, String privacy, boolean embeddable) {
        return """
                {"id": "%s", "snippet": {"publishedAt": "%s", "channelId": "%s", "title": "%s", "liveBroadcastContent": "none",
                 "thumbnails": {"medium": {"url": "https://i.ytimg.com/vi/%s/mqdefault.jpg"}}},
                 "status": {"privacyStatus": "%s", "uploadStatus": "processed", "embeddable": %s}}"""
                .formatted(id, published, CHANNEL, title, id, privacy, embeddable);
    }

    @Test
    void storesPublicEmbeddableRecentUploadsAndSendsTheKeyOnlyAsAHeader() {
        api.on("/youtube/v3/playlistItems", Reply.ok("""
                {"items": [{"contentDetails": {"videoId": "v1"}}, {"contentDetails": {"videoId": "v2"}},
                           {"contentDetails": {"videoId": "v3"}}]}""", "application/json"));
        api.on("/youtube/v3/videos", Reply.ok("{\"items\": ["
                + video("v1", "Inside Shanghai's new metro line", "2026-10-13T08:00:00Z", "public", true) + ","
                + video("v2", "Members only", "2026-10-13T08:00:00Z", "unlisted", true) + ","
                + video("v3", "An old explainer", "2026-07-01T08:00:00Z", "public", true) + "]}", "application/json"));

        RunOutcome outcome = connector("secret-key").run(context());

        assertThat(outcome.status()).isEqualTo(RunOutcome.Status.SUCCESS);
        assertThat(store.items).containsOnlyKeys("v1");
        SocialItem v1 = store.items.get("v1");
        assertThat(v1.url()).isEqualTo("https://www.youtube.com/watch?v=v1");
        assertThat(v1.thumbnailUrl()).isEqualTo("https://i.ytimg.com/vi/v1/mqdefault.jpg");
        assertThat(v1.countries()).containsExactly("CN");
        assertThat(api.requests()).allSatisfy(r -> {
            assertThat(r.header("X-Goog-Api-Key")).isEqualTo("secret-key");
            assertThat(r.query()).doesNotContain("secret-key");
        });
        assertThat(api.requests().getFirst().query()).contains("playlistId=UUabcdefghijklmnopqrstuv");
    }

    @Test
    void quotaExceededStopsTheRunWithoutLosingStoredVideos() {
        store.save(new SocialItem(Platform.YOUTUBE, "old", "u", CHANNEL, NOW.minus(Duration.ofDays(2)), "t", null, "t", null,
                null, List.of(), List.of()), 7, NOW.minus(Duration.ofDays(2)));
        api.on("/youtube/v3/playlistItems", new Reply(403,
                "{\"error\": {\"errors\": [{\"reason\": \"quotaExceeded\"}]}}".getBytes(java.nio.charset.StandardCharsets.UTF_8),
                Map.of("Content-Type", "application/json")));

        RunOutcome outcome = connector("secret-key").run(context());

        assertThat(outcome.status()).isEqualTo(RunOutcome.Status.FAILED);
        assertThat(outcome.errorMessage()).contains("quota");
        assertThat(store.items).containsKey("old");
    }

    @Test
    void storedVideosMadePrivateAreDeletedAtTheDailyCheck() {
        Instant twoDaysAgo = NOW.minus(Duration.ofDays(2));
        for (String id : List.of("keep", "gone", "private")) {
            store.save(new SocialItem(Platform.YOUTUBE, id, "u", CHANNEL, twoDaysAgo, "t", null, "t", null, null, List.of(),
                    List.of()), 7, twoDaysAgo);
        }
        api.on("/youtube/v3/playlistItems", Reply.ok("{\"items\": []}", "application/json"));
        api.on("/youtube/v3/videos", Reply.ok("{\"items\": ["
                + video("keep", "Still public", "2026-10-12T08:00:00Z", "public", true) + ","
                + video("private", "Now private", "2026-10-12T08:00:00Z", "private", true) + "]}", "application/json"));

        RunOutcome outcome = connector("secret-key").run(context());

        assertThat(store.items).containsOnlyKeys("keep");
        assertThat(outcome.details()).containsEntry("removed", 2);
    }

    @Test
    void withoutAKeyTheRunFailsVisibly() {
        RunOutcome outcome = connector("").run(context());
        assertThat(outcome.status()).isEqualTo(RunOutcome.Status.FAILED);
        assertThat(outcome.errorMessage()).isEqualTo("YOUTUBE_API_KEY is not set");
        assertThat(api.requests()).isEmpty();
    }
}
