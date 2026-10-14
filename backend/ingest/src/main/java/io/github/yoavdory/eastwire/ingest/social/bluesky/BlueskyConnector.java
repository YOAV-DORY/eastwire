package io.github.yoavdory.eastwire.ingest.social.bluesky;

import io.github.yoavdory.eastwire.core.social.SocialAccount;
import io.github.yoavdory.eastwire.core.social.SocialAccount.Platform;
import io.github.yoavdory.eastwire.core.social.SocialAccount.Scope;
import io.github.yoavdory.eastwire.core.social.SocialAccounts;
import io.github.yoavdory.eastwire.ingest.Connector;
import io.github.yoavdory.eastwire.ingest.http.HttpFetcher;
import io.github.yoavdory.eastwire.ingest.run.RunOutcome;
import io.github.yoavdory.eastwire.ingest.social.SocialItem;
import io.github.yoavdory.eastwire.ingest.social.SocialPlaces;
import io.github.yoavdory.eastwire.ingest.social.SocialStore;
import java.time.Instant;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * Original posts from the curated Bluesky accounts, then a re-check of every stored post.
 *
 * <p>Skipped and, if already stored, deleted: reposts, replies, posts older than 30 days,
 * posts whose author opted out of logged-out viewing ({@code !no-unauthenticated}) and posts
 * or authors carrying moderation labels. For world-wide outlets (scope "mentions") only
 * posts that name a covered country or city are kept.
 */
@Component
public class BlueskyConnector implements Connector {

    public static final String SLUG = "bluesky-curated";
    /** Moderation labels that keep a post off EastWire (Bluesky's global and self labels). */
    static final Set<String> BLOCKING_LABELS = Set.of("!no-unauthenticated", "!hide", "!takedown", "!warn", "porn", "sexual",
            "nudity", "graphic-media", "gore");
    static final int FEED_LIMIT = 50;
    private static final Logger log = LoggerFactory.getLogger(BlueskyConnector.class);

    private final BlueskyClient client;
    private final SocialAccounts accounts;
    private final SocialStore store;
    private final SocialPlaces places;

    public BlueskyConnector(HttpFetcher http, @Value("${eastwire.bluesky.base-url}") String baseUrl, SocialAccounts accounts,
            SocialStore store, SocialPlaces places) {
        this.client = new BlueskyClient(http, baseUrl);
        this.accounts = accounts;
        this.store = store;
        this.places = places;
    }

    @Override
    public String sourceSlug() {
        return SLUG;
    }

    @Override
    public RunOutcome run(Context ctx) {
        Map<String, Long> accountIds = store.accountIds(Platform.BLUESKY);
        Counts n = new Counts();
        String lastError = null;
        Integer lastStatus = null;
        Instant newest = null;
        List<SocialAccount> bluesky = accounts.on(Platform.BLUESKY);

        for (SocialAccount account : bluesky) {
            Long accountId = accountIds.get(account.id());
            if (accountId == null) {
                continue;
            }
            try {
                for (BlueskyClient.Post post : client.authorFeed(account.id(), FEED_LIMIT)) {
                    n.seen++;
                    String skip = skipReason(post, account, ctx.now());
                    if (skip != null) {
                        n.skipped.merge(skip, 1, Integer::sum);
                        if (!skip.equals("repost") && store.delete(Platform.BLUESKY, post.uri()) > 0) {
                            n.removed++;
                        }
                        continue;
                    }
                    List<String> countries = places.countriesNamedIn(post.text());
                    if (account.scope() == Scope.MENTIONS && countries.isEmpty()) {
                        n.skipped.merge("notAboutCoveredCountries", 1, Integer::sum);
                        continue;
                    }
                    SocialItem item = new SocialItem(Platform.BLUESKY, post.uri(), post.webUrl(), account.id(), post.createdAt(),
                            post.text(), post.cid(), null, null, post.linkedUrl(), post.labels(), countries);
                    if (store.save(item, accountId, ctx.now())) {
                        n.created++;
                        newest = newest == null || post.createdAt().isAfter(newest) ? post.createdAt() : newest;
                    }
                }
                n.accountsOk++;
            } catch (RuntimeException e) {
                n.accountsFailed++;
                lastError = account.handle() + ": " + e.getMessage();
                lastStatus = e instanceof HttpFetcher.FetchException fe && fe.status() > 0 ? fe.status() : null;
                log.warn("Bluesky feed failed for {}", lastError);
            }
        }

        try {
            revalidate(ctx.now(), n);
        } catch (RuntimeException e) {
            n.accountsFailed++;
            lastError = "re-check: " + e.getMessage();
            log.warn("Bluesky re-check failed: {}", e.getMessage());
        }

        Map<String, Object> details = new LinkedHashMap<>();
        details.put("accounts", bluesky.size());
        details.put("accountsFailed", n.accountsFailed);
        details.put("rechecked", n.rechecked);
        details.put("removed", n.removed);
        n.skipped.forEach((reason, count) -> details.put("skipped." + reason, count));
        log.info("Bluesky: {} account(s), {} posts seen, {} new, {} re-checked, {} removed", n.accountsOk, n.seen, n.created,
                n.rechecked, n.removed);

        if (!bluesky.isEmpty() && n.accountsOk == 0) {
            return new RunOutcome(RunOutcome.Status.FAILED, n.seen, 0, lastStatus, "BlueskyError", lastError, null, null, details);
        }
        RunOutcome.Status status = n.accountsFailed > 0 ? RunOutcome.Status.PARTIAL : RunOutcome.Status.SUCCESS;
        return new RunOutcome(status, n.seen, n.created, null, n.accountsFailed > 0 ? "BlueskyError" : null, lastError, null,
                newest, details);
    }

    /**
     * Every stored post is checked again each run: a post deleted on Bluesky, or labelled since,
     * disappears from EastWire within the hour (the embed would hide it too).
     */
    private void revalidate(Instant now, Counts n) {
        List<String> stored = store.toRevalidate(Platform.BLUESKY, now);
        for (int i = 0; i < stored.size(); i += BlueskyClient.MAX_URIS) {
            List<String> batch = stored.subList(i, Math.min(stored.size(), i + BlueskyClient.MAX_URIS));
            Set<String> stillUp = new HashSet<>();
            for (BlueskyClient.Post post : client.posts(batch)) {
                if (post.labels().stream().noneMatch(BLOCKING_LABELS::contains)) {
                    stillUp.add(post.uri());
                }
            }
            for (String uri : batch) {
                n.rechecked++;
                if (stillUp.contains(uri)) {
                    store.markVerified(Platform.BLUESKY, uri, now);
                } else {
                    n.removed += store.delete(Platform.BLUESKY, uri);
                }
            }
        }
    }

    static String skipReason(BlueskyClient.Post post, SocialAccount account, Instant now) {
        if (post.repost() || !post.authorDid().equals(account.id())) {
            return "repost";
        }
        if (post.reply()) {
            return "reply";
        }
        if (post.labels().stream().anyMatch(BLOCKING_LABELS::contains)) {
            return "labelled";
        }
        if (post.createdAt().isBefore(now.minus(SocialStore.RETENTION)) || post.createdAt().isAfter(now.plusSeconds(600))) {
            return "outsideWindow";
        }
        if (post.text().isBlank()) {
            return "noText";
        }
        return null;
    }

    private static final class Counts {
        int seen;
        int created;
        int removed;
        int rechecked;
        int accountsOk;
        int accountsFailed;
        final Map<String, Integer> skipped = new LinkedHashMap<>();
    }
}
