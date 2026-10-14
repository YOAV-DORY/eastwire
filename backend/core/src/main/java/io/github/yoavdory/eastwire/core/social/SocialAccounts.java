package io.github.yoavdory.eastwire.core.social;

import io.github.yoavdory.eastwire.core.config.ComplianceConfig;
import io.github.yoavdory.eastwire.core.config.DomainDecision;
import io.github.yoavdory.eastwire.core.social.SocialAccount.Platform;
import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.regex.Pattern;
import tools.jackson.core.StreamReadFeature;
import tools.jackson.databind.DeserializationFeature;
import tools.jackson.databind.MapperFeature;
import tools.jackson.databind.PropertyNamingStrategies;
import tools.jackson.dataformat.yaml.YAMLMapper;

/**
 * The parsed {@code config/social_accounts.yaml}, checked against the curation rules. Loading
 * fails if an account breaks one, so a bad entry can never reach production.
 */
public record SocialAccounts(List<SocialAccount> accounts) {

    private static final Pattern DID = Pattern.compile("did:(plc|web):[a-z0-9.:-]+");
    private static final Pattern CHANNEL = Pattern.compile("UC[A-Za-z0-9_-]{22}");

    private static final YAMLMapper YAML = YAMLMapper.builder()
            .propertyNamingStrategy(PropertyNamingStrategies.SNAKE_CASE)
            .enable(MapperFeature.ACCEPT_CASE_INSENSITIVE_ENUMS)
            .enable(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES)
            .enable(StreamReadFeature.STRICT_DUPLICATE_DETECTION)
            .build();

    public SocialAccounts {
        accounts = List.copyOf(accounts);
    }

    public static SocialAccounts load(Path configDir, ComplianceConfig config) {
        Path file = configDir.resolve("social_accounts.yaml");
        try (InputStream in = Files.newInputStream(file)) {
            SocialAccounts accounts = new SocialAccounts(YAML.readValue(in, AccountsFile.class).accounts());
            accounts.check(config);
            return accounts;
        } catch (IOException e) {
            throw new UncheckedIOException("Cannot read " + file, e);
        }
    }

    public List<SocialAccount> on(Platform platform) {
        return accounts.stream().filter(a -> a.platform() == platform).toList();
    }

    /** The curation rules from the header of social_accounts.yaml. */
    void check(ComplianceConfig config) {
        Set<String> seen = new HashSet<>();
        for (SocialAccount a : accounts) {
            String where = "social_accounts.yaml[" + a.handle() + "]: ";
            if (a.platform() == null || a.kind() == null || a.id() == null || a.handle() == null || a.name() == null
                    || a.domain() == null || a.reason() == null || a.evidenceUrl() == null || a.checkedOn() == null) {
                throw new IllegalStateException(where + "platform, id, handle, name, kind, domain, reason, "
                        + "evidence_url and checked_on are all required");
            }
            if (!seen.add(a.platform() + "|" + a.id())) {
                throw new IllegalStateException(where + "listed twice");
            }
            switch (a.platform()) {
                case BLUESKY -> {
                    if (!DID.matcher(a.id()).matches()) {
                        throw new IllegalStateException(where + "id must be a Bluesky DID");
                    }
                    // Domain-verified: the handle is the outlet's domain (or a subdomain of it).
                    String handle = a.handle().toLowerCase(Locale.ROOT);
                    if (!(handle.equals(a.domain()) || handle.endsWith("." + a.domain()))) {
                        throw new IllegalStateException(where + "handle must be the outlet's own domain " + a.domain());
                    }
                }
                case YOUTUBE -> {
                    if (!CHANNEL.matcher(a.id()).matches()) {
                        throw new IllegalStateException(where + "id must be a YouTube channel id (UC...)");
                    }
                }
            }
            config.domainPolicyFor(a.domain())
                    .filter(d -> d.decision() == DomainDecision.DENY)
                    .ifPresent(d -> {
                        throw new IllegalStateException(where + a.domain() + " is denied in domains.yaml (" + d.rule() + ")");
                    });
        }
    }

    private record AccountsFile(List<SocialAccount> accounts) {
    }
}
