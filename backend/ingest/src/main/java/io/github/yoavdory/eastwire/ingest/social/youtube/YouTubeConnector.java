package io.github.yoavdory.eastwire.ingest.social.youtube;

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
import java.time.Duration;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * New uploads from the curated YouTube channels, then a daily re-check of stored videos:
 * removed, private or no-longer-embeddable videos are deleted. Quota per run is about one
 * unit per channel plus one per 50 videos, far below the free 10,000 a day.
 */
@Component
public class YouTubeConnector implements Connector {

    public static final String SLUG = "youtube-curated";
    static final int UPLOADS_PER_CHANNEL = 10;
    /** Stored videos are re-checked once a day, well inside the 30-day refresh rule. */
    static final Duration RECHECK_AFTER = Duration.ofHours(20);
    private static final Logger log = LoggerFactory.getLogger(YouTubeConnector.class);

    private final YouTubeClient client;
    private final boolean hasKey;
    private final SocialAccounts accounts;
    private final SocialStore store;
    private final SocialPlaces places;

    public YouTubeConnector(HttpFetcher http, @Value("${eastwire.youtube.base-url}") String baseUrl,
            @Value("${eastwire.youtube.api-key:}") String apiKey, SocialAccounts accounts, SocialStore store,
            SocialPlaces places) {
        this.client = new YouTubeClient(http, baseUrl, apiKey);
        this.hasKey = apiKey != null && !apiKey.isBlank();
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
        if (!hasKey) {
            // Enabled in sources.yaml without the secret: fail visibly on /status rather than look fine.
            return RunOutcome.failed(new IllegalStateException("YOUTUBE_API_KEY is not set"), null);
        }
        Map<String, Long> accountIds = store.accountIds(Platform.YOUTUBE);
        List<SocialAccount> channels = accounts.on(Platform.YOUTUBE);
        int seen = 0;
        int created = 0;
        int removed = 0;
        int failed = 0;
        int ok = 0;
        int outOfScope = 0;
        String lastError = null;
        Instant newest = null;

        try {
            for (SocialAccount channel : channels) {
                Long accountId = accountIds.get(channel.id());
                if (accountId == null) {
                    continue;
                }
                try {
                    List<String> ids = client.latestUploads(channel.id(), UPLOADS_PER_CHANNEL);
                    for (YouTubeClient.Video v : client.videos(ids)) {
                        seen++;
                        boolean recent = v.publishedAt().isAfter(ctx.now().minus(SocialStore.RETENTION));
                        if (!v.publicAndEmbeddable() || !recent || !v.channelId().equals(channel.id())) {
                            removed += store.delete(Platform.YOUTUBE, v.id());
                            continue;
                        }
                        List<String> countries = places.countriesNamedIn(v.title());
                        if (channel.scope() == Scope.MENTIONS && countries.isEmpty()) {
                            outOfScope++;
                            continue;
                        }
                        SocialItem item = new SocialItem(Platform.YOUTUBE, v.id(), v.watchUrl(), channel.id(), v.publishedAt(),
                                v.title(), null, v.title(), v.thumbnailUrl(), null, List.of(), countries);
                        if (store.save(item, accountId, ctx.now())) {
                            created++;
                            newest = newest == null || v.publishedAt().isAfter(newest) ? v.publishedAt() : newest;
                        }
                    }
                    ok++;
                } catch (YouTubeClient.QuotaExceededException e) {
                    throw e;
                } catch (RuntimeException e) {
                    failed++;
                    lastError = channel.handle() + ": " + e.getMessage();
                    log.warn("YouTube channel failed: {}", lastError);
                }
            }
            removed += recheck(ctx.now());
        } catch (YouTubeClient.QuotaExceededException e) {
            // Keep what was stored; the next run after the daily reset continues.
            failed++;
            lastError = e.getMessage();
            log.warn("YouTube: {}", e.getMessage());
        }

        Map<String, Object> details = new LinkedHashMap<>();
        details.put("channels", channels.size());
        details.put("channelsFailed", failed);
        details.put("removed", removed);
        details.put("notAboutCoveredCountries", outOfScope);
        log.info("YouTube: {} channel(s), {} videos seen, {} new, {} removed", ok, seen, created, removed);
        if (!channels.isEmpty() && ok == 0) {
            return new RunOutcome(RunOutcome.Status.FAILED, seen, 0, null, "YouTubeError", lastError, null, null, details);
        }
        return new RunOutcome(failed > 0 ? RunOutcome.Status.PARTIAL : RunOutcome.Status.SUCCESS, seen, created, null,
                failed > 0 ? "YouTubeError" : null, lastError, null, newest, details);
    }

    /** Re-checks stored videos last verified more than 20 hours ago; returns how many were deleted. */
    private int recheck(Instant now) {
        List<String> stored = store.toRevalidate(Platform.YOUTUBE, now.minus(RECHECK_AFTER));
        int removed = 0;
        for (int i = 0; i < stored.size(); i += YouTubeClient.MAX_IDS) {
            List<String> batch = stored.subList(i, Math.min(stored.size(), i + YouTubeClient.MAX_IDS));
            Set<String> stillUp = client.videos(batch).stream()
                    .filter(YouTubeClient.Video::publicAndEmbeddable)
                    .map(YouTubeClient.Video::id)
                    .collect(Collectors.toSet());
            for (String id : batch) {
                if (stillUp.contains(id)) {
                    store.markVerified(Platform.YOUTUBE, id, now);
                } else {
                    removed += store.delete(Platform.YOUTUBE, id);
                }
            }
        }
        return removed;
    }
}
