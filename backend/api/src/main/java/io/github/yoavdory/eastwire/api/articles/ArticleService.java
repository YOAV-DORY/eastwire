package io.github.yoavdory.eastwire.api.articles;

import io.github.yoavdory.eastwire.core.config.ComplianceConfig;
import io.github.yoavdory.eastwire.core.config.SourceKind;
import io.github.yoavdory.eastwire.core.policy.DisplayDecision;
import io.github.yoavdory.eastwire.core.policy.DisplayPolicy;
import io.github.yoavdory.eastwire.core.policy.DisplayRequest;
import io.github.yoavdory.eastwire.core.policy.Excerpts;
import io.github.yoavdory.eastwire.core.sector.SectorDefinition;
import io.github.yoavdory.eastwire.core.sector.SectorRules;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Objects;
import org.springframework.stereotype.Service;
import tools.jackson.databind.json.JsonMapper;

/**
 * Turns stored rows into story cards. Every row passes the display policy again at read time,
 * so a publisher denied (or a source disabled) after ingestion disappears at once, and an
 * excerpt is never longer than the source currently allows.
 */
@Service
public class ArticleService {

    static final Duration NEW_FOR = Duration.ofHours(1);
    private static final JsonMapper JSON = JsonMapper.builder().build();

    private final ArticleRepository repository;
    private final DisplayPolicy policy;
    private final ComplianceConfig config;
    private final SectorRules sectorRules;
    private final Clock clock;

    public ArticleService(ArticleRepository repository, DisplayPolicy policy, ComplianceConfig config, SectorRules sectorRules,
            Clock clock) {
        this.repository = repository;
        this.policy = policy;
        this.config = config;
        this.sectorRules = sectorRules;
        this.clock = clock;
    }

    public ArticleView.Page page(ArticleQuery query) {
        long total = repository.count(query);
        List<ArticleRow> rows = balanced(query) ? balancedPage(query) : repository.find(query);
        Instant now = clock.instant();
        List<ArticleView> items = rows.stream().map(r -> toView(r, now)).filter(Objects::nonNull).toList();
        boolean hasMore = (long) query.offset() + rows.size() < total && query.page() < ArticleQuery.MAX_PAGE;
        return new ArticleView.Page(items, query.page(), query.size(), total, hasMore);
    }

    /** The plain feed (no place filter, no search) is balanced across countries; filtered views stay newest first. */
    static boolean balanced(ArticleQuery q) {
        return q.text() == null && q.country() == null && q.cityId() == null;
    }

    /** One page of the balanced order, built from every story that could appear on any page. */
    private List<ArticleRow> balancedPage(ArticleQuery q) {
        int window = ArticleQuery.MAX_PAGE * q.size();
        List<ArticleRow> candidates = repository.find(new ArticleQuery(null, null, q.from(), q.to(), 1, window, null,
                ArticleQuery.Sort.DATE, q.sector()));
        List<ArticleRow> ordered = FeedBalancer.balance(candidates, clock.instant());
        int from = Math.min(q.offset(), ordered.size());
        return ordered.subList(from, Math.min(ordered.size(), from + q.size()));
    }

    public ArticleView toView(ArticleRow r, Instant now) {
        DisplayDecision d = policy.decide(new DisplayRequest(r.sourceSlug(), r.url(), r.author(), r.creditLine(), false));
        if (!d.visible()) {
            return null;
        }
        String excerpt = d.showsExcerpt() ? Excerpts.truncate(r.excerpt(), d.excerptMaxChars()) : null;
        boolean discovery = config.source(r.sourceSlug()).map(s -> s.kind() == SourceKind.DISCOVERY).orElse(false);
        // Stored attribution already reflects what was shown at ingestion; drop the excerpt note if we cut it now.
        String attribution = excerpt == null && r.excerpt() != null ? d.attributionLine(false) : r.attribution();
        ArticleView.License license = r.licenseName() == null ? null : new ArticleView.License(r.licenseName(), r.licenseUrl());
        Instant discovered = r.discoveredAt();
        // "New" follows the story's own publication time, so a week-old post found today is not new.
        Instant reference = r.publishedAt() != null ? r.publishedAt() : discovered;
        return new ArticleView(r.id(), r.title(), r.url(), d.publisherName(), r.domain(),
                new ArticleView.Source(r.sourceSlug(), config.source(r.sourceSlug()).map(s -> s.name()).orElse(r.sourceSlug())),
                discovery, r.publishedAt(), discovered,
                reference != null && reference.isAfter(now.minus(NEW_FOR)),
                excerpt, attribution, license,
                r.locations().stream().map(l -> new ArticleView.LocationView(l.role(), l.precision(), l.confidence(),
                        l.method(), l.countryIso2(), l.placeId(), l.placeName(), l.evidence(), l.primary())).toList(),
                r.sectors().stream().map(this::sectorTag).toList(), Math.max(0, r.clusterSize() - 1),
                r.ingestedAt(), r.storyType() == null ? "news" : r.storyType());
    }

    private ArticleView.SectorTag sectorTag(ArticleRow.SectorRow row) {
        String label = sectorRules.sector(row.sector()).map(SectorDefinition::label).orElse(row.sector());
        List<ArticleView.Rule> rules = row.rulesJson() == null ? List.of() : List.of(JSON.readValue(row.rulesJson(), ArticleView.Rule[].class));
        return new ArticleView.SectorTag(row.sector(), label, row.score(), rules);
    }
}
