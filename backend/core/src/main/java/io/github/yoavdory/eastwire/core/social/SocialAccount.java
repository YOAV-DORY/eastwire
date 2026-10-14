package io.github.yoavdory.eastwire.core.social;

import java.time.LocalDate;
import java.util.Locale;

/**
 * One curated account from {@code config/social_accounts.yaml}.
 *
 * @param id     platform id: a Bluesky DID or a YouTube channel id (UC...)
 * @param domain the outlet's web domain, checked against domains.yaml
 * @param scope  ALL keeps every original post; MENTIONS keeps only posts naming a covered place
 */
public record SocialAccount(
        Platform platform,
        String id,
        String handle,
        String name,
        Kind kind,
        String domain,
        Scope scope,
        String reason,
        String evidenceUrl,
        LocalDate checkedOn) {

    public SocialAccount {
        domain = domain == null ? null : domain.toLowerCase(Locale.ROOT);
        scope = scope == null ? Scope.MENTIONS : scope;
    }

    public enum Platform {
        BLUESKY, YOUTUBE;

        public String db() {
            return name().toLowerCase(Locale.ROOT);
        }
    }

    public enum Kind {
        NEWSROOM, JOURNALIST, OFFICIAL;

        public String db() {
            return name().toLowerCase(Locale.ROOT);
        }
    }

    public enum Scope {
        ALL, MENTIONS
    }
}
