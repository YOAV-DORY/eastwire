package io.github.yoavdory.eastwire.api.social;

import static org.assertj.core.api.Assertions.assertThat;

import io.github.yoavdory.eastwire.core.config.ComplianceConfig;
import io.github.yoavdory.eastwire.core.config.RepoConfig;
import io.github.yoavdory.eastwire.core.config.SourceConfig;
import io.github.yoavdory.eastwire.core.policy.DisplayPolicy;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.Test;

class SocialServiceTest {

    private static final ComplianceConfig CONFIG = RepoConfig.load();

    /** Records which platforms were asked for and returns canned rows. */
    static class FakeRepository extends SocialRepository {
        final List<List<String>> asked = new ArrayList<>();
        final List<ItemRow> rows;
        final List<RelatedRow> related;

        FakeRepository(List<ItemRow> rows, List<RelatedRow> related) {
            super(null);
            this.rows = rows;
            this.related = related;
        }

        @Override
        public List<ItemRow> find(List<String> platforms, String country, int limit, int offset) {
            asked.add(platforms);
            return rows;
        }

        @Override
        public long count(List<String> platforms, String country) {
            return rows.size();
        }

        @Override
        public List<RelatedRow> related(List<Long> itemIds) {
            return related;
        }
    }

    private static SocialRepository.ItemRow row(long id) {
        return new SocialRepository.ItemRow(id, "bluesky", "https://bsky.app/profile/scroll.in/post/x" + id, "at://did/x" + id,
                "cid", "Post text", null, null, Instant.parse("2026-10-14T10:00:00Z"), List.of("IN"), "scroll.in", "Scroll",
                "newsroom", "Indian digital newsroom", "https://bsky.app/profile/scroll.in");
    }

    private static SocialRepository.RelatedRow related(long article, String url) {
        return new SocialRepository.RelatedRow(1, "shares_url", article, "Headline " + article, url, "gdelt-gkg", null, null);
    }

    @Test
    void onlyEnabledVerifiedPlatformsAreShownWithTheirLabel() {
        FakeRepository repo = new FakeRepository(List.of(row(1)), List.of());
        SocialService.Page page = new SocialService(repo, CONFIG, new DisplayPolicy(CONFIG)).page(null, null, 1, 12);

        // YouTube is disabled in sources.yaml until its API key is set.
        assertThat(repo.asked).containsExactly(List.of("bluesky"));
        assertThat(page.items().getFirst().label()).isEqualTo("Social post · not verified reporting");
        assertThat(page.items().getFirst().account().reason()).isEqualTo("Indian digital newsroom");

        FakeRepository youtubeOnly = new FakeRepository(List.of(row(1)), List.of());
        assertThat(new SocialService(youtubeOnly, CONFIG, new DisplayPolicy(CONFIG)).page("youtube", null, 1, 12).items()).isEmpty();
        assertThat(youtubeOnly.asked).isEmpty();
    }

    @Test
    void aPlatformSwitchedOffInConfigDisappearsAtOnce() {
        SourceConfig bluesky = CONFIG.source("bluesky-curated").orElseThrow();
        ComplianceConfig off = CONFIG.withSource(bluesky.withEnabled(false));
        FakeRepository repo = new FakeRepository(List.of(row(1)), List.of());
        assertThat(new SocialService(repo, off, new DisplayPolicy(off)).page(null, null, 1, 12).items()).isEmpty();
    }

    @Test
    void relatedStoriesPassTheDisplayPolicyAndAreCapped() {
        FakeRepository repo = new FakeRepository(List.of(row(1)), List.of(
                related(10, "https://scroll.in/article/10/a"),
                related(11, "https://www.scmp.com/news/asia/11"),   // denied publisher: never shown
                related(12, "https://scroll.in/article/12/b"),
                related(13, "https://scroll.in/article/13/c"),
                related(14, "https://scroll.in/article/14/d")));
        List<SocialService.Related> rel = new SocialService(repo, CONFIG, new DisplayPolicy(CONFIG)).page(null, null, 1, 12)
                .items().getFirst().related();
        assertThat(rel).extracting(SocialService.Related::articleId).containsExactly(10L, 12L, 13L);
        assertThat(rel.getFirst().publisher()).isEqualTo("Scroll.in");
    }
}
