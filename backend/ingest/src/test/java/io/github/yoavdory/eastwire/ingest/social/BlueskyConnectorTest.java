package io.github.yoavdory.eastwire.ingest.social;

import static org.assertj.core.api.Assertions.assertThat;

import io.github.yoavdory.eastwire.core.config.ComplianceConfig;
import io.github.yoavdory.eastwire.core.config.RepoConfig;
import io.github.yoavdory.eastwire.core.config.SourceConfig;
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
import io.github.yoavdory.eastwire.ingest.social.bluesky.BlueskyConnector;
import java.io.IOException;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;

/** Invented accounts and posts; no real post text. */
class BlueskyConnectorTest {

    private static final ComplianceConfig CONFIG = RepoConfig.load();
    private static final Instant NOW = Instant.parse("2026-10-14T12:00:00Z");
    private static final String INDIA_DESK = "did:plc:indiadesk";
    private static final String WORLD_DESK = "did:plc:worlddesk";

    private final TestHttpServer api = new TestHttpServer();
    private final InMemorySocialStore store = new InMemorySocialStore(Map.of(INDIA_DESK, 1L, WORLD_DESK, 2L));
    private final BlueskyConnector connector = new BlueskyConnector(
            new HttpFetcher("test", Duration.ofSeconds(5), 2, Duration.ofMillis(1), Duration.ofSeconds(1), d -> { }),
            api.uri("/xrpc/").toString(),
            new SocialAccounts(List.of(account(INDIA_DESK, "india.example", Scope.ALL), account(WORLD_DESK, "world.example", Scope.MENTIONS))),
            store,
            new SocialPlaces(CONFIG, new Gazetteer(CONFIG.cities(), CONFIG.activeCountries(), CONFIG.requiresCountryContext())));

    BlueskyConnectorTest() throws IOException {
    }

    @AfterEach
    void stop() {
        api.close();
    }

    private static SocialAccount account(String did, String handle, Scope scope) {
        return new SocialAccount(Platform.BLUESKY, did, handle, handle, Kind.NEWSROOM, handle, scope, "Test",
                "https://bsky.app/profile/" + handle, LocalDate.of(2026, 10, 14));
    }

    static String post(String did, String handle, String rkey, String text, String createdAt, String extra, String labels) {
        return """
                {"uri": "at://%s/app.bsky.feed.post/%s", "cid": "bafy%s",
                 "author": {"did": "%s", "handle": "%s", "labels": []},
                 "record": {"$type": "app.bsky.feed.post", "text": "%s", "createdAt": "%s"%s},
                 "labels": [%s]}""".formatted(did, rkey, rkey, did, handle, text, createdAt, extra, labels);
    }

    private static String feed(String... items) {
        return "{\"feed\": [" + String.join(",", items) + "]}";
    }

    private Connector.Context context() {
        SourceConfig source = CONFIG.source(BlueskyConnector.SLUG).orElseThrow();
        return new Connector.Context(source, (short) 1, null, NOW);
    }

    @Test
    void keepsOriginalPostsAndSkipsRepostsRepliesLabelsAndOldPosts() {
        String link = ", \"embed\": {\"$type\": \"app.bsky.embed.external\", \"external\": {\"uri\": \"https://india.example/story\"}}";
        api.on("/xrpc/app.bsky.feed.getAuthorFeed", r -> r.query().contains("indiadesk")
                ? Reply.ok(feed(
                        "{\"post\": " + post(INDIA_DESK, "india.example", "a1", "Metro line opens", "2026-10-14T10:00:00Z", link, "") + "}",
                        "{\"post\": " + post("did:plc:other", "other.example", "a2", "Shared", "2026-10-14T10:00:00Z", "", "")
                                + ", \"reason\": {\"$type\": \"app.bsky.feed.defs#reasonRepost\"}}",
                        "{\"post\": " + post(INDIA_DESK, "india.example", "a3", "Thanks!", "2026-10-14T10:00:00Z",
                                ", \"reply\": {\"root\": {}, \"parent\": {}}", "") + "}",
                        "{\"post\": " + post(INDIA_DESK, "india.example", "a4", "Graphic", "2026-10-14T10:00:00Z", "",
                                "{\"val\": \"graphic-media\"}") + "}",
                        "{\"post\": " + post(INDIA_DESK, "india.example", "a5", "Old news", "2026-08-01T10:00:00Z", "", "") + "}"),
                        "application/json")
                : Reply.ok(feed(), "application/json"));

        RunOutcome outcome = connector.run(context());

        assertThat(outcome.status()).isEqualTo(RunOutcome.Status.SUCCESS);
        assertThat(store.items).containsOnlyKeys("at://did:plc:indiadesk/app.bsky.feed.post/a1");
        SocialItem kept = store.items.values().iterator().next();
        assertThat(kept.url()).isEqualTo("https://bsky.app/profile/india.example/post/a1");
        assertThat(kept.linkedUrl()).isEqualTo("https://india.example/story");
        assertThat(kept.countries()).isEmpty();   // never inferred from the account
        assertThat(outcome.details()).containsEntry("skipped.repost", 1).containsEntry("skipped.reply", 1)
                .containsEntry("skipped.labelled", 1).containsEntry("skipped.outsideWindow", 1);
    }

    @Test
    void worldWideAccountsKeepOnlyPostsNamingACoveredPlace() {
        api.on("/xrpc/app.bsky.feed.getAuthorFeed", r -> r.query().contains("worlddesk")
                ? Reply.ok(feed(
                        "{\"post\": " + post(WORLD_DESK, "world.example", "w1", "Floods hit Chennai as rains continue", "2026-10-14T09:00:00Z", "", "") + "}",
                        "{\"post\": " + post(WORLD_DESK, "world.example", "w2", "Elections in Peru", "2026-10-14T09:00:00Z", "", "") + "}"),
                        "application/json")
                : Reply.ok(feed(), "application/json"));

        connector.run(context());

        assertThat(store.items).containsOnlyKeys("at://did:plc:worlddesk/app.bsky.feed.post/w1");
        assertThat(store.items.values().iterator().next().countries()).containsExactly("IN");
    }

    @Test
    void storedPostsThatWereDeletedOrLabelledAreRemoved() {
        Instant earlier = NOW.minus(Duration.ofHours(1));
        for (String rkey : List.of("k1", "k2", "k3")) {
            store.save(new SocialItem(Platform.BLUESKY, "at://did:plc:indiadesk/app.bsky.feed.post/" + rkey, "u", INDIA_DESK,
                    earlier, "text", "c", null, null, null, List.of(), List.of()), 1, earlier);
        }
        api.on("/xrpc/app.bsky.feed.getAuthorFeed", Reply.ok(feed(), "application/json"));
        // k1 still up, k2 deleted (absent), k3 now labelled.
        api.on("/xrpc/app.bsky.feed.getPosts", Reply.ok("{\"posts\": ["
                + post(INDIA_DESK, "india.example", "k1", "Still here", "2026-10-14T10:00:00Z", "", "") + ","
                + post(INDIA_DESK, "india.example", "k3", "Now labelled", "2026-10-14T10:00:00Z", "", "{\"val\": \"!no-unauthenticated\"}")
                + "]}", "application/json"));

        RunOutcome outcome = connector.run(context());

        assertThat(store.items).containsOnlyKeys("at://did:plc:indiadesk/app.bsky.feed.post/k1");
        assertThat(store.verified.get("at://did:plc:indiadesk/app.bsky.feed.post/k1")).isEqualTo(NOW);
        assertThat(outcome.details()).containsEntry("rechecked", 3).containsEntry("removed", 2);
    }

    @Test
    void oneFailingAccountMakesTheRunPartial() {
        api.on("/xrpc/app.bsky.feed.getAuthorFeed", r -> r.query().contains("worlddesk")
                ? Reply.status(400)
                : Reply.ok(feed(), "application/json"));
        RunOutcome outcome = connector.run(context());
        assertThat(outcome.status()).isEqualTo(RunOutcome.Status.PARTIAL);
        assertThat(outcome.errorMessage()).contains("world.example");
    }
}
