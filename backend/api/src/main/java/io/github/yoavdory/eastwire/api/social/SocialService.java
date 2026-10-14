package io.github.yoavdory.eastwire.api.social;

import io.github.yoavdory.eastwire.core.config.ComplianceConfig;
import io.github.yoavdory.eastwire.core.config.SourceConfig;
import io.github.yoavdory.eastwire.core.config.SourceStatus;
import io.github.yoavdory.eastwire.core.policy.DisplayDecision;
import io.github.yoavdory.eastwire.core.policy.DisplayPolicy;
import io.github.yoavdory.eastwire.core.policy.DisplayRequest;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;

/**
 * The social section. Shown only while the platform's source is enabled and verified in
 * config/sources.yaml, so switching a platform off hides its posts at once. Related stories
 * pass the same display policy as the news feed.
 */
@Service
public class SocialService {

    public static final int MAX_PAGE = 20;
    public static final int MAX_SIZE = 50;
    static final int MAX_RELATED = 3;
    static final Map<String, String> SOURCE_FOR_PLATFORM = Map.of("bluesky", "bluesky-curated", "youtube", "youtube-curated");

    /**
     * @param text      Bluesky post text, shown as the embed's plain fallback until the reader loads the embed
     * @param related   stories in our sources linked to the post (shared URL or matching headline)
     * @param label     the source's permanent label, e.g. "Social post · not verified reporting"
     */
    public record SocialItemView(long id, String platform, String url, String externalId, String cid, String text, String title,
            String thumbnailUrl, Instant createdAt, Account account, List<String> countries, List<Related> related, String label) {
    }

    /** Why this account is here (curation is public). */
    public record Account(String handle, String name, String kind, String reason, String evidenceUrl) {
    }

    /** @param linkType shares_url (the post links to it) or text_overlap (its headline appears in the post) */
    public record Related(long articleId, String title, String url, String publisher, String linkType) {
    }

    public record Page(List<SocialItemView> items, int page, int size, long total, boolean hasMore) {
    }

    private final SocialRepository repository;
    private final ComplianceConfig config;
    private final DisplayPolicy policy;

    public SocialService(SocialRepository repository, ComplianceConfig config, DisplayPolicy policy) {
        this.repository = repository;
        this.config = config;
        this.policy = policy;
    }

    public Page page(String platform, String country, int page, int size) {
        List<String> platforms = SOURCE_FOR_PLATFORM.keySet().stream()
                .filter(p -> platform == null || p.equals(platform))
                .filter(p -> live(SOURCE_FOR_PLATFORM.get(p)))
                .sorted()
                .toList();
        if (platforms.isEmpty()) {
            return new Page(List.of(), page, size, 0, false);
        }
        int offset = (page - 1) * size;
        List<SocialRepository.ItemRow> rows = repository.find(platforms, country, size, offset);
        long total = repository.count(platforms, country);
        Map<Long, List<Related>> related = related(rows.stream().map(SocialRepository.ItemRow::id).toList());
        List<SocialItemView> items = rows.stream()
                .map(r -> new SocialItemView(r.id(), r.platform(), r.url(), r.externalId(), r.cid(), r.text(), r.title(),
                        r.thumbnailUrl(), r.createdAt(), new Account(r.handle(), r.name(), r.kind(), r.reason(), r.evidenceUrl()),
                        r.countries(), related.getOrDefault(r.id(), List.of()), label(r.platform())))
                .toList();
        boolean hasMore = (long) offset + rows.size() < total && page < MAX_PAGE;
        return new Page(items, page, size, total, hasMore);
    }

    private Map<Long, List<Related>> related(List<Long> ids) {
        Map<Long, List<Related>> out = new LinkedHashMap<>();
        for (SocialRepository.RelatedRow r : repository.related(ids)) {
            List<Related> list = out.computeIfAbsent(r.itemId(), k -> new ArrayList<>());
            if (list.size() >= MAX_RELATED || list.stream().anyMatch(x -> x.articleId() == r.articleId())) {
                continue;
            }
            DisplayDecision d = policy.decide(new DisplayRequest(r.sourceSlug(), r.url(), r.author(), r.credit(), false));
            if (d.visible()) {
                list.add(new Related(r.articleId(), r.title(), r.url(), d.publisherName(), r.linkType()));
            }
        }
        return out;
    }

    private boolean live(String sourceSlug) {
        return config.source(sourceSlug).map(s -> s.enabled() && s.status() == SourceStatus.VERIFIED).orElse(false);
    }

    private String label(String platform) {
        return config.source(SOURCE_FOR_PLATFORM.get(platform)).map(SourceConfig::label).orElse("Not verified reporting");
    }
}
