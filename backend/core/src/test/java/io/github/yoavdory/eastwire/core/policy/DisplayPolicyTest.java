package io.github.yoavdory.eastwire.core.policy;

import static org.assertj.core.api.Assertions.assertThat;

import io.github.yoavdory.eastwire.core.config.ComplianceConfig;
import io.github.yoavdory.eastwire.core.config.RepoConfig;
import io.github.yoavdory.eastwire.core.config.SourceConfig;
import io.github.yoavdory.eastwire.core.config.SourceStatus;
import java.util.stream.Stream;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.MethodSource;
import org.junit.jupiter.params.provider.ValueSource;

/** One expectation per row of the source matrix, plus the domain-review rules. */
class DisplayPolicyTest {

    private static final ComplianceConfig CONFIG = RepoConfig.load();
    private final DisplayPolicy policy = new DisplayPolicy(CONFIG);

    static Stream<SourceConfig> excludedSources() {
        return CONFIG.sources().stream().filter(s -> s.status() == SourceStatus.EXCLUDED);
    }

    static Stream<SourceConfig> conditionalSources() {
        return CONFIG.sources().stream().filter(s -> s.status() == SourceStatus.CONDITIONAL);
    }

    @ParameterizedTest(name = "{0} is hidden")
    @MethodSource("excludedSources")
    void excludedSourcesAreNeverShown(SourceConfig source) {
        DisplayDecision d = policy.decide(DisplayRequest.of(source.slug(), "https://example.org/a"));
        assertThat(d.visible()).isFalse();
        assertThat(d.reason()).isEqualTo("source excluded");
    }

    @ParameterizedTest(name = "{0} is hidden until its condition is met")
    @MethodSource("conditionalSources")
    void conditionalSourcesStayHiddenWhileDisabled(SourceConfig source) {
        DisplayDecision d = policy.decide(DisplayRequest.of(source.slug(), "https://example.org/a"));
        assertThat(d.visible()).isFalse();
    }

    @Test
    void unknownSourceIsHidden() {
        assertThat(policy.decide(DisplayRequest.of("made-up", "https://example.org")).visible()).isFalse();
    }

    @Test
    void noDecisionEverShowsAnImage() {
        Stream.of(
                        DisplayRequest.of("gdelt-gkg", "https://mainichi.jp/english/articles/1"),
                        new DisplayRequest("global-voices", "https://globalvoices.org/2026/09/25/x/", "A. Writer", null, false))
                .map(policy::decide)
                .forEach(d -> assertThat(d.showImage()).isFalse());
    }

    @Nested
    class DiscoveredViaGdelt {

        @Test
        void allowedDomainInsideItsSectionIsAHeadlineLinkOnly() {
            DisplayDecision d = policy.decide(DisplayRequest.of("gdelt-gkg",
                    "https://mainichi.jp/english/articles/20261013/p2g/00m/0na/036000c"));
            assertThat(d.visible()).isTrue();
            assertThat(d.excerptMaxChars()).isZero();
            assertThat(d.publisherName()).isEqualTo("The Mainichi (English edition)");
            assertThat(d.attribution()).contains("GDELT");
        }

        @Test
        void allowedDomainOutsideItsSectionIsHidden() {
            DisplayDecision d = policy.decide(DisplayRequest.of("gdelt-gkg", "https://mainichi.jp/articles/20261013/k00/00m/1"));
            assertThat(d.visible()).isFalse();
            assertThat(d.reason()).contains("allowed section");
        }

        @Test
        void wwwPrefixDoesNotMatter() {
            assertThat(policy.decide(DisplayRequest.of("gdelt-gkg", "https://www.sixthtone.com/news/1")).visible()).isTrue();
        }

        @ParameterizedTest(name = "{0}")
        @ValueSource(strings = {
                "https://www.scmp.com/news/china/article/1",
                "https://www.thehindu.com/news/national/x/article1.ece",
                "https://frontline.thehindu.com/the-nation/x/article1.ece",
                "https://www.thehindubusinessline.com/economy/x/article1.ece",
                "https://www.koreatimes.co.kr/southkorea/1",
                "https://english.kyodonews.net/articles/-/1",
                "https://en.yna.co.kr/view/AEN1",
                "https://www.heraldglobe.com/news/1"})
        void deniedPublishersAreHiddenIncludingSubdomains(String url) {
            DisplayDecision d = policy.decide(DisplayRequest.of("gdelt-gkg", url));
            assertThat(d.visible()).isFalse();
            assertThat(d.reason()).startsWith("publisher denied");
        }

        @ParameterizedTest(name = "{0}")
        @ValueSource(strings = {
                "https://www3.nhk.or.jp/nhkworld/en/news/1/",   // pending
                "https://unknown-publisher.example/story",       // never reviewed
                "https://notscmp.com/story"})                    // not a subdomain of scmp.com
        void pendingAndUnknownPublishersAreHidden(String url) {
            DisplayDecision d = policy.decide(DisplayRequest.of("gdelt-gkg", url));
            assertThat(d.visible()).isFalse();
            assertThat(d.reason()).isEqualTo("publisher not reviewed");
        }

        @ParameterizedTest(name = "{0}")
        @ValueSource(strings = {"not a url", "ftp://mainichi.jp/english/x", "javascript:alert(1)", ""})
        void invalidUrlsAreHidden(String url) {
            assertThat(policy.decide(DisplayRequest.of("gdelt-gkg", url)).visible()).isFalse();
        }
    }

    @Nested
    class GlobalVoices {

        private static final String URL = "https://globalvoices.org/2026/09/25/movement-from-behind-your-gadget/";

        @Test
        void showsAnExcerptWithAuthorAndLicense() {
            DisplayDecision d = policy.decide(new DisplayRequest("global-voices", URL, "Juliana Harsianti", null, false));
            assertThat(d.visible()).isTrue();
            assertThat(d.excerptMaxChars()).isEqualTo(300);
            assertThat(d.attributionLine(true)).isEqualTo("By Juliana Harsianti, Global Voices · CC BY 3.0 · excerpt, shortened");
            assertThat(d.licenseUrl()).isEqualTo("https://creativecommons.org/licenses/by/3.0/");
        }

        @Test
        void saysExcerptOnlyWhenAnExcerptIsShown() {
            DisplayDecision d = policy.decide(new DisplayRequest("global-voices", URL, "Juliana Harsianti", null, false));
            assertThat(d.attributionLine(false)).isEqualTo("By Juliana Harsianti, Global Voices · CC BY 3.0");
        }

        @Test
        void dropsTheBylineCleanlyWhenThereIsNoAuthor() {
            DisplayDecision d = policy.decide(new DisplayRequest("global-voices", URL, null, null, false));
            assertThat(d.attributionLine(true)).isEqualTo("Global Voices · CC BY 3.0 · excerpt, shortened");
        }

        @Test
        void partnerReprintsAreLinkOnlyAndClaimNoLicense() {
            DisplayDecision d = policy.decide(new DisplayRequest("global-voices", URL, "Someone", null, true));
            assertThat(d.visible()).isTrue();
            assertThat(d.excerptMaxChars()).isZero();
            assertThat(d.licenseName()).isNull();
            assertThat(d.attributionLine(false)).isEqualTo("By Someone, Global Voices");
        }

        @Test
        void aDeniedPublisherStaysDeniedEvenThroughAFeed() {
            DisplayDecision d = policy.decide(DisplayRequest.of("global-voices", "https://www.scmp.com/news/1"));
            assertThat(d.visible()).isFalse();
        }
    }

    @Nested
    class JapanTimesOnceEnabled {

        private final DisplayPolicy enabled = new DisplayPolicy(
                CONFIG.withSource(CONFIG.source("japan-times").orElseThrow().withEnabled(true)));
        private static final String URL = "https://www.japantimes.co.jp/news/2026/10/13/japan/x/";

        @Test
        void ownReportingGetsTheDekExcerpt() {
            DisplayDecision d = enabled.decide(new DisplayRequest("japan-times", URL, null, "Kathleen Benoza", false));
            assertThat(d.excerptMaxChars()).isEqualTo(200);
            assertThat(d.attribution()).isEqualTo("The Japan Times");
        }

        @ParameterizedTest(name = "{0}")
        @ValueSource(strings = {"AFP-Jiji", "Reuters", "Kyodo", "Bloomberg", "AP"})
        void wireCopyIsHeadlineOnly(String credit) {
            DisplayDecision d = enabled.decide(new DisplayRequest("japan-times", URL, null, credit, false));
            assertThat(d.visible()).isTrue();
            assertThat(d.excerptMaxChars()).isZero();
        }

        @Test
        void wordsContainingWireNamesAreNotWireCredits() {
            assertThat(DisplayPolicy.isWireCredit("Apple Daily staff")).isFalse();
            assertThat(DisplayPolicy.isWireCredit("Staff writer")).isFalse();
        }
    }

    @Nested
    class SocialOnceEnabled {

        @Test
        void youtubeIsEmbedOnlyWithItsLabel() {
            DisplayPolicy enabled = new DisplayPolicy(
                    CONFIG.withSource(CONFIG.source("youtube-curated").orElseThrow().withEnabled(true)));
            DisplayDecision d = enabled.decide(DisplayRequest.of("youtube-curated", "https://www.youtube.com/watch?v=abc"));
            assertThat(d.visible()).isTrue();
            assertThat(d.excerptMaxChars()).isZero();
            assertThat(d.label()).isEqualTo("Video · not verified reporting");
        }
    }
}
