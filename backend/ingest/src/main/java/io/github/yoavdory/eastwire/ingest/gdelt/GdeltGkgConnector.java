package io.github.yoavdory.eastwire.ingest.gdelt;

import io.github.yoavdory.eastwire.core.article.Location;
import io.github.yoavdory.eastwire.core.article.Location.Confidence;
import io.github.yoavdory.eastwire.core.article.Location.Method;
import io.github.yoavdory.eastwire.core.article.Location.Precision;
import io.github.yoavdory.eastwire.core.article.Location.Role;
import io.github.yoavdory.eastwire.core.config.ComplianceConfig;
import io.github.yoavdory.eastwire.core.config.DomainPolicy;
import io.github.yoavdory.eastwire.core.policy.DisplayPolicy;
import io.github.yoavdory.eastwire.core.geo.Gazetteer;
import io.github.yoavdory.eastwire.core.geo.PrimaryPlaces;
import io.github.yoavdory.eastwire.core.policy.DisplayRequest;
import io.github.yoavdory.eastwire.core.sector.SectorSignals;
import io.github.yoavdory.eastwire.ingest.Connector;
import io.github.yoavdory.eastwire.ingest.http.HttpFetcher;
import io.github.yoavdory.eastwire.ingest.pipeline.ArticleCandidate;
import io.github.yoavdory.eastwire.ingest.pipeline.ArticleSink;
import io.github.yoavdory.eastwire.ingest.pipeline.ArticleSink.WriteResult;
import io.github.yoavdory.eastwire.ingest.pipeline.Text;
import io.github.yoavdory.eastwire.ingest.run.RunOutcome;
import java.io.BufferedReader;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.UncheckedIOException;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.EnumMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * Discovery through GDELT's raw GKG files (the DOC and GEO APIs proved unreliable or offline,
 * see docs/source-matrix.md). Each run processes the 15-minute files published since the
 * cursor. Only articles from publisher domains marked {@code allow} in config/domains.yaml
 * that mention a covered country become headline links.
 *
 * <p>The newest announced file can return 404 for a few minutes: the run then stops there
 * and the next run retries it. An older missing file is recorded as a gap.
 */
@Component
public class GdeltGkgConnector implements Connector {

    public static final String SLUG = "gdelt-gkg";
    private static final Logger log = LoggerFactory.getLogger(GdeltGkgConnector.class);
    private static final Duration NEWEST_GRACE = Duration.ofMinutes(30);

    private final HttpFetcher http;
    private final ArticleSink sink;
    private final ComplianceConfig config;
    private final DisplayPolicy policy;
    private final GkgLocationMapper locations;
    private final Gazetteer gazetteer;
    private final String baseUrl;
    private final Duration maxLookback;
    private final Duration bootstrap;

    public GdeltGkgConnector(HttpFetcher http, ArticleSink sink, ComplianceConfig config, DisplayPolicy policy,
            Gazetteer gazetteer,
            @Value("${eastwire.gdelt.base-url}") String baseUrl,
            @Value("${eastwire.gdelt.max-lookback}") Duration maxLookback,
            @Value("${eastwire.gdelt.bootstrap}") Duration bootstrap) {
        this.http = http;
        this.sink = sink;
        this.config = config;
        this.policy = policy;
        this.locations = new GkgLocationMapper(config);
        this.gazetteer = gazetteer;
        this.baseUrl = baseUrl.endsWith("/") ? baseUrl.substring(0, baseUrl.length() - 1) : baseUrl;
        this.maxLookback = maxLookback;
        this.bootstrap = bootstrap;
    }

    @Override
    public String sourceSlug() {
        return SLUG;
    }

    @Override
    public RunOutcome run(Context ctx) {
        HttpFetcher.Response last = http.get(URI.create(baseUrl + "/lastupdate.txt"));
        if (last.status() != 200) {
            throw new HttpFetcher.FetchException("lastupdate.txt returned HTTP " + last.status(), last.status(), null);
        }
        Instant latest = GkgSlots.latestFromLastUpdate(last.text())
                .orElseThrow(() -> new IllegalStateException("No GKG file listed in lastupdate.txt"));
        GkgSlots.Plan plan = GkgSlots.plan(ctx.cursor(), latest, maxLookback, bootstrap);

        Counters counters = new Counters();
        counters.gaps = plan.skippedBeyondLookback();
        String cursor = ctx.cursor();
        Instant waitingFor = null;
        for (Instant slot : plan.slots()) {
            URI uri = URI.create(baseUrl + "/" + GkgSlots.format(slot) + ".gkg.csv.zip");
            HttpFetcher.Response response = http.get(uri);
            if (response.status() == 404) {
                if (slot.isAfter(latest.minus(NEWEST_GRACE))) {
                    waitingFor = slot;   // not published yet; retry next run from here
                    break;
                }
                counters.gaps++;
                cursor = GkgSlots.format(slot);
                continue;
            }
            if (response.status() != 200) {
                throw new HttpFetcher.FetchException("GKG file " + uri + " returned HTTP " + response.status(),
                        response.status(), null);
            }
            processFile(response.body(), counters);
            counters.slots++;
            cursor = GkgSlots.format(slot);
        }

        RunOutcome.Status status = counters.gaps > 0 || counters.malformed > 0 ? RunOutcome.Status.PARTIAL : RunOutcome.Status.SUCCESS;
        Map<String, Object> details = new LinkedHashMap<>();
        details.put("latestSlot", GkgSlots.format(latest));
        details.put("slotsProcessed", counters.slots);
        details.put("gaps", counters.gaps);
        details.put("malformedRows", counters.malformed);
        details.put("notAboutCoveredCountries", counters.notCovered);
        if (waitingFor != null) {
            details.put("waitingForSlot", GkgSlots.format(waitingFor));
        }
        counters.results.forEach((kind, n) -> details.put("result." + kind.name().toLowerCase(), n));
        log.info("GDELT GKG: {} slot(s), {} rows, {} new articles, {} gap(s)", counters.slots, counters.rows,
                counters.count(WriteResult.Kind.NEW), counters.gaps);
        return new RunOutcome(status, counters.rows, counters.count(WriteResult.Kind.NEW), 200, null, null, cursor,
                counters.newest, details);
    }

    private void processFile(byte[] zip, Counters counters) {
        try (ZipInputStream in = new ZipInputStream(new ByteArrayInputStream(zip))) {
            ZipEntry entry = in.getNextEntry();
            if (entry == null) {
                throw new IllegalStateException("Empty GKG zip file");
            }
            BufferedReader reader = new BufferedReader(new InputStreamReader(in, StandardCharsets.UTF_8));
            String line;
            while ((line = reader.readLine()) != null) {
                counters.rows++;
                try {
                    GkgParser.parse(line).flatMap(r -> toCandidate(r, counters)).ifPresent(c -> {
                        WriteResult result = sink.write(c);
                        counters.record(result.kind());
                        if (result.kind() == WriteResult.Kind.NEW) {
                            counters.newest = max(counters.newest, c.referenceTime());
                        }
                    });
                } catch (IllegalArgumentException e) {
                    counters.malformed++;
                }
            }
        } catch (IOException e) {
            throw new UncheckedIOException("Cannot read GKG zip", e);
        }
    }

    private Optional<ArticleCandidate> toCandidate(GkgRecord r, Counters counters) {
        // Cheap check first: most rows come from publishers that are not allowed.
        if (!policy.decide(DisplayRequest.of(SLUG, r.url())).visible()) {
            counters.record(WriteResult.Kind.HIDDEN);
            return Optional.empty();
        }
        List<Location> mentioned = locations.map(r.locations());
        if (mentioned.isEmpty()) {
            counters.notCovered++;
            return Optional.empty();
        }
        List<Location> all = new ArrayList<>(mentioned);
        publisherLocation(r.url()).ifPresent(all::add);
        all = PrimaryPlaces.mark(Text.title(r.title()), all, gazetteer, true);
        return Optional.of(new ArticleCandidate(SLUG, r.url(), Text.title(r.title()), null, null, null, false,
                ArticleCandidate.ExcerptKind.NONE, r.publishedAt(), r.date(), "en", all, SectorSignals.themes(r.themes())));
    }

    /** Where the publisher is based, from the reviewed domain entry (never from the article). */
    private Optional<Location> publisherLocation(String url) {
        String host = io.github.yoavdory.eastwire.core.article.UrlCanonicalizer.domain(url);
        return config.domainPolicyFor(host)
                .filter(d -> d.country() != null)
                .filter(d -> config.activeCountries().stream().anyMatch(c -> c.iso2().equals(d.country())))
                .map((DomainPolicy d) -> new Location(null, d.country(), Role.PUBLISHER, Precision.COUNTRY,
                        Confidence.HIGH, Method.SOURCE_REGISTRY, "Publisher: " + d.publisher()));
    }

    private static Instant max(Instant a, Instant b) {
        return a == null || (b != null && b.isAfter(a)) ? b : a;
    }

    private static final class Counters {
        int slots;
        int rows;
        int gaps;
        int malformed;
        int notCovered;
        Instant newest;
        final Map<WriteResult.Kind, Integer> results = new EnumMap<>(WriteResult.Kind.class);

        void record(WriteResult.Kind kind) {
            results.merge(kind, 1, Integer::sum);
        }

        int count(WriteResult.Kind kind) {
            return results.getOrDefault(kind, 0);
        }
    }
}
