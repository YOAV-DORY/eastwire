package io.github.yoavdory.eastwire.ingest.social;

import static org.assertj.core.api.Assertions.assertThat;

import io.github.yoavdory.eastwire.core.article.Location;
import io.github.yoavdory.eastwire.core.article.Location.Confidence;
import io.github.yoavdory.eastwire.core.article.Location.Method;
import io.github.yoavdory.eastwire.core.article.Location.Precision;
import io.github.yoavdory.eastwire.core.article.Location.Role;
import io.github.yoavdory.eastwire.core.sector.SectorSignals;
import io.github.yoavdory.eastwire.core.social.SocialAccount.Platform;
import io.github.yoavdory.eastwire.core.social.SocialAccounts;
import io.github.yoavdory.eastwire.ingest.PostgresTestBase;
import io.github.yoavdory.eastwire.ingest.pipeline.ArticleCandidate;
import io.github.yoavdory.eastwire.ingest.pipeline.ArticleWriter;
import io.github.yoavdory.eastwire.ingest.pipeline.RetentionPurger;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

/** Store, linker, account sync and purge against real Postgres (CI). Invented content. */
class SocialIntegrationTest extends PostgresTestBase {

    private static final String SCROLL_DID = "did:plc:ibwdymi2pdjcfscefihqcaj6";   // in config/social_accounts.yaml

    @Autowired
    SocialStore store;

    @Autowired
    SocialLinker linker;

    @Autowired
    ArticleWriter writer;

    @Autowired
    RetentionPurger purger;

    private long scrollAccount() {
        return store.accountIds(Platform.BLUESKY).get(SCROLL_DID);
    }

    private static SocialItem post(String rkey, String text, String linkedUrl, Instant created) {
        return new SocialItem(Platform.BLUESKY, "at://" + SCROLL_DID + "/app.bsky.feed.post/" + rkey,
                "https://bsky.app/profile/scroll.in/post/" + rkey, SCROLL_DID, created, text, "bafy" + rkey, null, null,
                linkedUrl, List.of(), List.of("IN"));
    }

    private long article(String url, String title) {
        return writer.write(new ArticleCandidate("gdelt-gkg", url, title, null, null, null, false, ArticleCandidate.ExcerptKind.NONE,
                null, Instant.now().minusSeconds(600), "en",
                List.of(new Location(null, "IN", Role.MENTIONED, Precision.COUNTRY, Confidence.MEDIUM, Method.GDELT_GKG, "Mentions India")),
                SectorSignals.NONE)).articleId();
    }

    @Test
    void savesOnceThenRefreshes() {
        Instant now = Instant.now();
        assertThat(store.save(post("a1", "First version", null, now.minusSeconds(60)), scrollAccount(), now)).isTrue();
        assertThat(store.save(post("a1", "Edited version", null, now.minusSeconds(60)), scrollAccount(), now)).isFalse();
        assertThat(jdbc.sql("SELECT index_text FROM social_item").query(String.class).single()).isEqualTo("Edited version");
        assertThat(jdbc.sql("SELECT countries[1] FROM social_item").query(String.class).single()).isEqualTo("IN");
    }

    @Test
    void takenDownPostsAreNeverStored() {
        jdbc.sql("INSERT INTO suppression (platform, external_id, reason) VALUES ('bluesky', :id, 'request')")
                .param("id", "at://" + SCROLL_DID + "/app.bsky.feed.post/t1").update();
        assertThat(store.save(post("t1", "Text", null, Instant.now()), scrollAccount(), Instant.now())).isFalse();
        assertThat(count("SELECT count(*) FROM social_item")).isZero();
    }

    @Test
    void linksPostsBySharedUrlAndByHeadline() {
        long shared = article("https://scroll.in/article/1/metro-line-opens", "Metro line opens in Bengaluru");
        long quoted = article("https://scroll.in/article/2/heat", "Heatwave closes schools across north India");
        Instant now = Instant.now();
        store.save(post("p1", "Read our report", "https://scroll.in/article/1/metro-line-opens?utm_source=bsky", now), scrollAccount(), now);
        store.save(post("p2", "Heatwave closes schools across north India: what parents need to know", null, now), scrollAccount(), now);
        store.save(post("p3", "A poem for Sunday", null, now), scrollAccount(), now);

        SocialLinker.Result result = linker.link();

        assertThat(result).isEqualTo(new SocialLinker.Result(1, 1));
        assertThat(jdbc.sql("""
                        SELECT a.id FROM social_link l JOIN article a ON a.cluster_id = l.cluster_id
                        JOIN social_item s ON s.id = l.social_item_id WHERE l.link_type = :type
                        """).param("type", "shares_url").query(Long.class).single()).isEqualTo(shared);
        assertThat(jdbc.sql("""
                        SELECT a.id FROM social_link l JOIN article a ON a.cluster_id = l.cluster_id WHERE l.link_type = :type
                        """).param("type", "text_overlap").query(Long.class).single()).isEqualTo(quoted);
        assertThat(linker.link()).isEqualTo(new SocialLinker.Result(0, 0));   // idempotent
    }

    @Test
    void accountsRemovedFromConfigAreDisabledAndTheirPostsDeleted() {
        store.save(post("r1", "Text", null, Instant.now()), scrollAccount(), Instant.now());
        configSync.syncSocial(new SocialAccounts(List.of()));
        assertThat(count("SELECT count(*) FROM social_item")).isZero();
        assertThat(count("SELECT count(*) FROM social_account WHERE enabled")).isZero();
        configSync.syncSocial(socialAccounts);
        assertThat(count("SELECT count(*) FROM social_account WHERE enabled")).isEqualTo(socialAccounts.accounts().size());
    }

    @Test
    void postsOlderThan30DaysArePurged() {
        Instant old = Instant.now().minus(Duration.ofDays(31));
        store.save(post("o1", "Old", null, old), scrollAccount(), old);
        store.save(post("n1", "New", null, Instant.now()), scrollAccount(), Instant.now());
        assertThat(purger.purge().socialExpired()).isEqualTo(1);
        assertThat(jdbc.sql("SELECT index_text FROM social_item").query(String.class).single()).isEqualTo("New");
    }
}
