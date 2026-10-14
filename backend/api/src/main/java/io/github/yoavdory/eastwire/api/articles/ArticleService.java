package io.github.yoavdory.eastwire.api.articles;

import io.github.yoavdory.eastwire.core.config.ComplianceConfig;
import io.github.yoavdory.eastwire.core.config.SourceKind;
import io.github.yoavdory.eastwire.core.policy.DisplayDecision;
import io.github.yoavdory.eastwire.core.policy.DisplayPolicy;
import io.github.yoavdory.eastwire.core.policy.DisplayRequest;
import io.github.yoavdory.eastwire.core.policy.Excerpts;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Objects;
import org.springframework.stereotype.Service;

/**
 * Turns stored rows into story cards. Every row passes the display policy again at read time,
 * so a publisher denied (or a source disabled) after ingestion disappears at once, and an
 * excerpt is never longer than the source currently allows.
 */
@Service
public class ArticleService {

    static final Duration NEW_FOR = Duration.ofHours(1);

    private final ArticleRepository repository;
    private final DisplayPolicy policy;
    private final ComplianceConfig config;
    private final Clock clock;

    public ArticleService(ArticleRepository repository, DisplayPolicy policy, ComplianceConfig config, Clock clock) {
        this.repository = repository;
        this.policy = policy;
        this.config = config;
        this.clock = clock;
    }

    public ArticleView.Page page(ArticleQuery query) {
        List<ArticleRow> rows = repository.find(query);
        long total = repository.count(query);
        Instant now = clock.instant();
        List<ArticleView> items = rows.stream().map(r -> toView(r, now)).filter(Objects::nonNull).toList();
        boolean hasMore = (long) query.offset() + rows.size() < total && query.page() < ArticleQuery.MAX_PAGE;
        return new ArticleView.Page(items, query.page(), query.size(), total, hasMore);
    }

    ArticleView toView(ArticleRow r, Instant now) {
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
        return new ArticleView(r.id(), r.title(), r.url(), d.publisherName(), r.domain(),
                new ArticleView.Source(r.sourceSlug(), config.source(r.sourceSlug()).map(s -> s.name()).orElse(r.sourceSlug())),
                discovery, r.publishedAt(), discovered,
                discovered != null && discovered.isAfter(now.minus(NEW_FOR)),
                excerpt, attribution, license,
                r.locations().stream().map(l -> new ArticleView.LocationView(l.role(), l.precision(), l.confidence(),
                        l.method(), l.countryIso2(), l.placeId(), l.placeName(), l.evidence())).toList(),
                r.sectors(), Math.max(0, r.clusterSize() - 1));
    }
}
