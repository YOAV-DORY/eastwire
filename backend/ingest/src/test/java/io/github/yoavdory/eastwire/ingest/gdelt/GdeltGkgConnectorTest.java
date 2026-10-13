package io.github.yoavdory.eastwire.ingest.gdelt;

import static io.github.yoavdory.eastwire.ingest.gdelt.GkgFixtures.INDIA;
import static io.github.yoavdory.eastwire.ingest.gdelt.GkgFixtures.NEW_DELHI;
import static io.github.yoavdory.eastwire.ingest.gdelt.GkgFixtures.UNITED_STATES;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import io.github.yoavdory.eastwire.core.article.Location.Role;
import io.github.yoavdory.eastwire.core.config.ComplianceConfig;
import io.github.yoavdory.eastwire.core.config.RepoConfig;
import io.github.yoavdory.eastwire.core.policy.DisplayPolicy;
import io.github.yoavdory.eastwire.ingest.Connector;
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
import java.util.List;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;

class GdeltGkgConnectorTest {

    private static final ComplianceConfig CONFIG = RepoConfig.load();
    private static final Instant NOW = Instant.parse("2026-10-13T11:40:00Z");

    private final TestHttpServer gdelt = new TestHttpServer();
    private final List<ArticleCandidate> written = new ArrayList<>();
    private final GdeltGkgConnector connector = new GdeltGkgConnector(
            new HttpFetcher("test", Duration.ofSeconds(5), 2, Duration.ofMillis(1), Duration.ofSeconds(1), d -> { }),
            c -> {
                written.add(c);
                return WriteResult.created(written.size());
            },
            CONFIG, new DisplayPolicy(CONFIG), gdelt.uri("/gdeltv2").toString(), Duration.ofHours(6), Duration.ofHours(1));

    GdeltGkgConnectorTest() throws IOException {
    }

    @AfterEach
    void stop() {
        gdelt.close();
    }

    private Connector.Context context(String cursor) {
        return new Connector.Context(CONFIG.source("gdelt-gkg").orElseThrow(), (short) 1, cursor, NOW);
    }

    private void serveSlot(String slot, String... rows) {
        gdelt.on("/gdeltv2/" + slot + ".gkg.csv.zip", Reply.ok(GkgFixtures.zip(slot + ".gkg.csv", List.of(rows))));
    }

    @Test
    void keepsOnlyAllowedPublishersThatMentionCoveredCountries() {
        gdelt.on("/gdeltv2/lastupdate.txt", Reply.ok(GkgFixtures.lastUpdate("20261013113000"), "text/plain"));
        serveSlot("20261013113000",
                GkgFixtures.row("20261013113000", "https://www.scroll.in/article/1/made-up-story", "Metro work resumes", NEW_DELHI),
                GkgFixtures.row("20261013113000", "https://www.thehindu.com/news/x.ece", "Denied publisher", INDIA),
                GkgFixtures.row("20261013113000", "https://unreviewed.example/x", "Unreviewed publisher", INDIA),
                GkgFixtures.row("20261013113000", "https://scroll.in/article/2/other", "Only about the US", UNITED_STATES));

        RunOutcome outcome = connector.run(context("20261013111500"));

        assertThat(outcome.status()).isEqualTo(RunOutcome.Status.SUCCESS);
        assertThat(outcome.cursorAfter()).isEqualTo("20261013113000");
        assertThat(outcome.details()).containsEntry("result.hidden", 2).containsEntry("notAboutCoveredCountries", 1);
        assertThat(written).singleElement().satisfies(c -> {
            assertThat(c.title()).isEqualTo("Metro work resumes");
            assertThat(c.summary()).isNull();
            assertThat(c.discoveredAt()).isEqualTo(Instant.parse("2026-10-13T11:30:00Z"));
            assertThat(c.locations()).extracting(l -> l.role()).containsExactly(Role.MENTIONED, Role.PUBLISHER);
            assertThat(c.locations().get(1).evidence()).isEqualTo("Publisher: Scroll.in");
        });
    }

    @Test
    void stopsAtTheNewestFileWhileItIsNotPublishedYet() {
        gdelt.on("/gdeltv2/lastupdate.txt", Reply.ok(GkgFixtures.lastUpdate("20261013113000"), "text/plain"));
        serveSlot("20261013111500", GkgFixtures.row("20261013111500", "https://scroll.in/article/3/x", "A story", INDIA));
        // 20261013113000 is announced but still 404

        RunOutcome outcome = connector.run(context("20261013110000"));

        assertThat(outcome.cursorAfter()).isEqualTo("20261013111500");
        assertThat(outcome.details()).containsEntry("waitingForSlot", "20261013113000").containsEntry("gaps", 0);
        assertThat(outcome.status()).isEqualTo(RunOutcome.Status.SUCCESS);
    }

    @Test
    void anOlderMissingFileIsAGapAndTheRunContinues() {
        gdelt.on("/gdeltv2/lastupdate.txt", Reply.ok(GkgFixtures.lastUpdate("20261013113000"), "text/plain"));
        serveSlot("20261013111500", GkgFixtures.row("20261013111500", "https://scroll.in/article/4/x", "Story", INDIA));
        serveSlot("20261013113000", GkgFixtures.row("20261013113000", "https://scroll.in/article/5/x", "Story two", INDIA));
        // 20261013104500 and 20261013110000 are missing and older than 30 minutes

        RunOutcome outcome = connector.run(context("20261013103000"));

        assertThat(outcome.status()).isEqualTo(RunOutcome.Status.PARTIAL);
        assertThat(outcome.details()).containsEntry("gaps", 2).containsEntry("slotsProcessed", 2);
        assertThat(outcome.cursorAfter()).isEqualTo("20261013113000");
        assertThat(written).hasSize(2);
    }

    @Test
    void malformedRowsAreCountedNotFatal() {
        gdelt.on("/gdeltv2/lastupdate.txt", Reply.ok(GkgFixtures.lastUpdate("20261013113000"), "text/plain"));
        serveSlot("20261013113000", "not\ta\tgkg\trow",
                GkgFixtures.row("20261013113000", "https://scroll.in/article/6/x", "Fine row", INDIA));

        RunOutcome outcome = connector.run(context("20261013111500"));

        assertThat(outcome.status()).isEqualTo(RunOutcome.Status.PARTIAL);
        assertThat(outcome.details()).containsEntry("malformedRows", 1);
        assertThat(written).hasSize(1);
    }

    @Test
    void failsWhenLastUpdateIsUnavailable() {
        gdelt.on("/gdeltv2/lastupdate.txt", Reply.status(503));
        assertThatThrownBy(() -> connector.run(context(null))).isInstanceOf(HttpFetcher.FetchException.class);
    }
}
