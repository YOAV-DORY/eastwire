package io.github.yoavdory.eastwire.core.social;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import io.github.yoavdory.eastwire.core.config.ComplianceConfig;
import io.github.yoavdory.eastwire.core.config.RepoConfig;
import io.github.yoavdory.eastwire.core.social.SocialAccount.Kind;
import io.github.yoavdory.eastwire.core.social.SocialAccount.Platform;
import io.github.yoavdory.eastwire.core.social.SocialAccount.Scope;
import java.nio.file.Path;
import java.time.LocalDate;
import java.util.List;
import org.junit.jupiter.api.Test;

class SocialAccountsTest {

    private static final ComplianceConfig CONFIG = RepoConfig.load();

    private static SocialAccount bluesky(String did, String handle, String domain) {
        return new SocialAccount(Platform.BLUESKY, did, handle, "Name", Kind.NEWSROOM, domain, Scope.ALL, "Why",
                "https://bsky.app/profile/" + handle, LocalDate.of(2026, 10, 14));
    }

    @Test
    void repoAccountsFollowTheCurationRules() {
        SocialAccounts accounts = SocialAccounts.load(Path.of(System.getProperty(ComplianceConfig.CONFIG_DIR_PROPERTY)), CONFIG);
        assertThat(accounts.on(Platform.BLUESKY)).isNotEmpty().allSatisfy(a -> assertThat(a.handle()).isEqualTo(a.domain()));
        assertThat(accounts.on(Platform.YOUTUBE)).isNotEmpty();
    }

    @Test
    void blueskyHandlesMustBeTheOutletsOwnDomain() {
        new SocialAccounts(List.of(bluesky("did:plc:abc", "news.scroll.in", "scroll.in"))).check(CONFIG);
        assertThatThrownBy(() -> new SocialAccounts(List.of(bluesky("did:plc:abc", "scroll.bsky.social", "scroll.in"))).check(CONFIG))
                .hasMessageContaining("handle must be the outlet's own domain");
        assertThatThrownBy(() -> new SocialAccounts(List.of(bluesky("scroll.in", "scroll.in", "scroll.in"))).check(CONFIG))
                .hasMessageContaining("DID");
    }

    @Test
    void publishersDeniedInTheDomainReviewCannotBeCurated() {
        assertThatThrownBy(() -> new SocialAccounts(List.of(bluesky("did:plc:abc", "scmp.com", "scmp.com"))).check(CONFIG))
                .hasMessageContaining("scmp.com is denied in domains.yaml");
    }

    @Test
    void accountsAreListedOnce() {
        SocialAccount a = bluesky("did:plc:abc", "scroll.in", "scroll.in");
        assertThatThrownBy(() -> new SocialAccounts(List.of(a, a)).check(CONFIG)).hasMessageContaining("listed twice");
    }
}
