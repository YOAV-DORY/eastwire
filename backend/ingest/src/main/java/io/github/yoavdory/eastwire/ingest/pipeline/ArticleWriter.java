package io.github.yoavdory.eastwire.ingest.pipeline;

import io.github.yoavdory.eastwire.core.article.Location;
import io.github.yoavdory.eastwire.core.article.UrlCanonicalizer;
import io.github.yoavdory.eastwire.core.config.ComplianceConfig;
import io.github.yoavdory.eastwire.core.config.QualityRules;
import io.github.yoavdory.eastwire.core.config.SourceConfig;
import io.github.yoavdory.eastwire.core.policy.DisplayDecision;
import io.github.yoavdory.eastwire.core.policy.DisplayPolicy;
import io.github.yoavdory.eastwire.core.policy.DisplayRequest;
import io.github.yoavdory.eastwire.core.policy.Excerpts;
import io.github.yoavdory.eastwire.ingest.pipeline.ArticleSink.WriteResult.Kind;
import io.github.yoavdory.eastwire.ingest.summary.Summarizer;
import java.sql.Timestamp;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * Stores candidates as articles. For each one, in a single transaction:
 * display policy → not-news filter → URL dedupe → takedown check → excerpt cut to the permitted length →
 * insert → locations → sectors → cluster with near-identical headlines from the last 48 hours.
 */
@Component
public class ArticleWriter implements ArticleSink {

    /** Headlines at least this similar (pg_trgm, 0..1) are treated as the same story. */
    static final double CLUSTER_SIMILARITY = 0.6;
    static final Duration CLUSTER_WINDOW = Duration.ofHours(48);

    private final JdbcClient jdbc;
    private final TransactionTemplate tx;
    private final ComplianceConfig config;
    private final DisplayPolicy policy;
    private final SectorTagger sectors;
    private final QualityRules quality;
    private final Clock clock;
    private final Map<String, Short> sourceIds = new ConcurrentHashMap<>();
    private final Summarizer summarizer;

    public ArticleWriter(JdbcClient jdbc, TransactionTemplate tx, ComplianceConfig config, DisplayPolicy policy,
            SectorTagger sectors, QualityRules quality, Clock clock) {
        this(jdbc, tx, config, policy, sectors, quality, clock, Summarizer.NONE);
    }

    @Autowired
    public ArticleWriter(JdbcClient jdbc, TransactionTemplate tx, ComplianceConfig config, DisplayPolicy policy,
            SectorTagger sectors, QualityRules quality, Clock clock, Summarizer summarizer) {
        this.summarizer = summarizer;
        this.jdbc = jdbc;
        this.tx = tx;
        this.config = config;
        this.policy = policy;
        this.sectors = sectors;
        this.quality = quality;
        this.clock = clock;
    }

    @Override
    public WriteResult write(ArticleCandidate c) {
        DisplayDecision decision = policy.decide(
                new DisplayRequest(c.sourceSlug(), c.url(), c.author(), c.credit(), c.partnerReprint()));
        if (!decision.visible()) {
            return WriteResult.of(Kind.HIDDEN, decision.reason());
        }
        if (c.title() == null || c.title().isBlank()) {
            return WriteResult.of(Kind.INVALID, "empty title");
        }
        String notNews = quality.notNewsReason(c.url(), c.title());
        if (notNews != null) {
            return WriteResult.of(Kind.NOT_NEWS, notNews);
        }
        SourceConfig source = config.source(c.sourceSlug()).orElseThrow();
        Instant now = clock.instant();
        Instant expiresAt = c.referenceTime().plus(Duration.ofDays(source.retentionDays() == null ? 30 : source.retentionDays()));
        if (!expiresAt.isAfter(now)) {
            return WriteResult.of(Kind.TOO_OLD, "older than the retention window");
        }

        String canonical;
        byte[] hash;
        try {
            canonical = UrlCanonicalizer.canonicalUrl(c.url());
            hash = UrlCanonicalizer.hash(c.url());
        } catch (IllegalArgumentException e) {
            return WriteResult.of(Kind.INVALID, e.getMessage());
        }

        String excerpt = decision.showsExcerpt() ? Excerpts.truncate(Text.plain(c.summary()), decision.excerptMaxChars()) : null;
        ArticleCandidate.ExcerptKind excerptKind = excerpt == null ? ArticleCandidate.ExcerptKind.NONE : c.excerptKind();
        if (excerptKind == ArticleCandidate.ExcerptKind.NONE) {
            excerpt = null;
        }
        String finalExcerpt = excerpt;

        WriteResult result = tx.execute(status -> {
            if (isSuppressed(hash)) {
                return WriteResult.of(Kind.SUPPRESSED, "taken down");
            }
            Optional<Long> id = insertArticle(c, decision, canonical, hash, finalExcerpt, excerptKind, now, expiresAt);
            if (id.isEmpty()) {
                return WriteResult.of(Kind.DUPLICATE, "already stored");
            }
            c.locations().forEach(location -> insertLocation(id.get(), location));
            sectors.tag(id.get(), c.title(), finalExcerpt, c.signals());
            cluster(id.get(), c.title(), now);
            return WriteResult.created(id.get());
        });
        if (result != null && (result.kind() == Kind.NEW || result.kind() == Kind.DUPLICATE)
                && source.summaries() && c.summary() != null && !c.partnerReprint()) {
            summarize(hash, c);
        }
        return result;
    }

    /**
     * EastWire's own summary for a story still in its source's feed, written once: on the run that
     * stores it, or on the first later run for stories stored before summaries existed. A
     * rejected attempt is recorded (summary_method "rejected:...") so it is not retried every hour.
     * Only from text this source lets us work from, and stored only if it passed SummaryCheck.
     */
    private void summarize(byte[] hash, ArticleCandidate c) {
        if (summarizer == Summarizer.NONE) {
            return;
        }
        Optional<Long> id = jdbc.sql("SELECT id FROM article WHERE url_hash = :hash AND summary IS NULL AND summary_method IS NULL")
                .param("hash", hash)
                .query(Long.class)
                .optional();
        if (id.isEmpty()) {
            return;
        }
        Optional<String> summary = summarizer.summarize(c.title(), Text.plain(c.summary()));
        jdbc.sql("UPDATE article SET summary = :summary, summary_method = :method WHERE id = :id")
                .param("summary", summary.orElse(null))
                .param("method", summary.isPresent() ? summarizer.method() : "rejected:" + summarizer.method())
                .param("id", id.get())
                .update();
    }

    private Optional<Long> insertArticle(ArticleCandidate c, DisplayDecision decision, String canonical,
            byte[] hash, String excerpt, ArticleCandidate.ExcerptKind excerptKind, Instant now, Instant expiresAt) {
        boolean hasExcerpt = excerpt != null;
        return jdbc.sql("""
                        INSERT INTO article (source_id, canonical_url, url_hash, domain, title, excerpt, excerpt_kind,
                                             author, credit_line, published_at, discovered_at, language, display_mode,
                                             license_name, license_url, attribution, expires_at, ingested_at, story_type)
                        VALUES (:sourceId, :url, :hash, :domain, :title, :excerpt, :excerptKind,
                                :author, :credit, :publishedAt, :discoveredAt, :language, :displayMode,
                                :licenseName, :licenseUrl, :attribution, :expiresAt, :ingestedAt, :storyType)
                        ON CONFLICT (url_hash) DO NOTHING
                        RETURNING id
                        """)
                .param("sourceId", sourceId(c.sourceSlug()))
                .param("url", canonical)
                .param("hash", hash)
                .param("domain", UrlCanonicalizer.domain(c.url()))
                .param("title", c.title())
                .param("excerpt", excerpt)
                .param("excerptKind", excerptKind.name().toLowerCase(Locale.ROOT))
                .param("author", c.author())
                .param("credit", c.credit())
                .param("publishedAt", ts(c.publishedAt()))
                .param("discoveredAt", ts(c.discoveredAt() != null ? c.discoveredAt() : now))
                .param("language", c.language() == null ? "en" : c.language())
                .param("displayMode", hasExcerpt ? "headline_excerpt" : "headline_only")
                .param("licenseName", decision.licenseName())
                .param("licenseUrl", decision.licenseUrl())
                .param("attribution", decision.attributionLine(hasExcerpt))
                .param("expiresAt", ts(expiresAt))
                .param("ingestedAt", ts(now))
                .param("storyType", c.storyType().name().toLowerCase(Locale.ROOT))
                .query(Long.class)
                .optional();
    }

    private void insertLocation(long articleId, Location l) {
        jdbc.sql("""
                        INSERT INTO article_location (article_id, place_id, country_iso2, role, precision, confidence,
                                                      method, evidence_snippet, is_primary)
                        VALUES (:articleId, :placeId, :country, :role, :precision, :confidence, :method, :evidence,
                                :primary)
                        ON CONFLICT DO NOTHING
                        """)
                .param("articleId", articleId)
                .param("placeId", l.placeId())
                .param("country", l.countryIso2())
                .param("role", Location.db(l.role()))
                .param("precision", Location.db(l.precision()))
                .param("confidence", Location.db(l.confidence()))
                .param("method", Location.db(l.method()))
                .param("evidence", l.evidence())
                .param("primary", l.primary())
                .update();
    }

    /** Joins the most similar recent headline's story cluster, creating the cluster if needed. */
    private void cluster(long articleId, String title, Instant now) {
        record Similar(long id, Long clusterId) {
        }
        Optional<Similar> similar = jdbc.sql("""
                        SELECT id, cluster_id FROM article
                        WHERE id <> :id AND discovered_at > :since
                          AND title % :title AND similarity(title, :title) >= :threshold
                        ORDER BY similarity(title, :title) DESC, id
                        LIMIT 1
                        """)
                .param("id", articleId).param("since", ts(now.minus(CLUSTER_WINDOW)))
                .param("title", title).param("threshold", CLUSTER_SIMILARITY)
                .query((rs, n) -> new Similar(rs.getLong("id"), (Long) rs.getObject("cluster_id")))
                .optional();
        if (similar.isEmpty()) {
            return;
        }
        long clusterId;
        if (similar.get().clusterId() != null) {
            clusterId = similar.get().clusterId();
            jdbc.sql("UPDATE story_cluster SET size = size + 1 WHERE id = :c").param("c", clusterId).update();
        } else {
            clusterId = jdbc.sql("""
                            INSERT INTO story_cluster (first_seen_at, representative_article_id, size)
                            VALUES (:now, :rep, 2) RETURNING id
                            """)
                    .param("now", ts(now)).param("rep", similar.get().id()).query(Long.class).single();
            jdbc.sql("UPDATE article SET cluster_id = :c WHERE id = :id").param("c", clusterId).param("id", similar.get().id()).update();
        }
        jdbc.sql("UPDATE article SET cluster_id = :c WHERE id = :id").param("c", clusterId).param("id", articleId).update();
    }

    private boolean isSuppressed(byte[] hash) {
        return jdbc.sql("SELECT EXISTS (SELECT 1 FROM suppression WHERE url_hash = :hash)")
                .param("hash", hash).query(Boolean.class).single();
    }

    private short sourceId(String slug) {
        return sourceIds.computeIfAbsent(slug, s -> jdbc.sql("SELECT id FROM source WHERE slug = :slug")
                .param("slug", s).query(Short.class).single());
    }

    private static Timestamp ts(Instant instant) {
        return instant == null ? null : Timestamp.from(instant);
    }
}
