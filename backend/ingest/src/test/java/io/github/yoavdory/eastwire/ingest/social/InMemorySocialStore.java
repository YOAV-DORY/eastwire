package io.github.yoavdory.eastwire.ingest.social;

import io.github.yoavdory.eastwire.core.social.SocialAccount.Platform;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** SocialStore without a database, for connector tests. */
public class InMemorySocialStore extends SocialStore {

    public final Map<String, SocialItem> items = new LinkedHashMap<>();
    public final Map<String, Instant> verified = new LinkedHashMap<>();
    private final Map<String, Long> accounts;

    public InMemorySocialStore(Map<String, Long> accounts) {
        super(null);
        this.accounts = accounts;
    }

    @Override
    public Map<String, Long> accountIds(Platform platform) {
        return accounts;
    }

    @Override
    public boolean save(SocialItem item, long accountId, Instant now) {
        verified.put(item.externalId(), now);
        return items.put(item.externalId(), item) == null;
    }

    @Override
    public List<String> toRevalidate(Platform platform, Instant before) {
        return items.values().stream()
                .filter(i -> i.platform() == platform && verified.get(i.externalId()).isBefore(before))
                .map(SocialItem::externalId)
                .toList();
    }

    @Override
    public void markVerified(Platform platform, String externalId, Instant now) {
        verified.put(externalId, now);
    }

    @Override
    public int delete(Platform platform, String externalId) {
        verified.remove(externalId);
        return items.remove(externalId) == null ? 0 : 1;
    }
}
