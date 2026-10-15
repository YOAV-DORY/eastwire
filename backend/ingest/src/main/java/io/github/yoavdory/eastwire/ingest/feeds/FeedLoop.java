package io.github.yoavdory.eastwire.ingest.feeds;

import com.rometools.rome.feed.synd.SyndEntry;
import com.rometools.rome.feed.synd.SyndFeed;
import com.rometools.rome.io.FeedException;
import com.rometools.rome.io.SyndFeedInput;
import com.rometools.rome.io.XmlReader;
import io.github.yoavdory.eastwire.ingest.Connector;
import io.github.yoavdory.eastwire.ingest.http.FetchStateRepository;
import io.github.yoavdory.eastwire.ingest.http.HttpFetcher;
import io.github.yoavdory.eastwire.ingest.pipeline.ArticleCandidate;
import io.github.yoavdory.eastwire.ingest.pipeline.ArticleSink;
import io.github.yoavdory.eastwire.ingest.pipeline.ArticleSink.WriteResult;
import io.github.yoavdory.eastwire.ingest.run.RunOutcome;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.EnumMap;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.function.Function;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * The fetch loop every RSS source shares: conditional GET per feed, parse, map each entry,
 * write. One failing feed makes the run PARTIAL, all failing makes it FAILED, and after
 * {@link #HOST_DOWN_AFTER} network failures in a row the remaining feeds wait for the next run.
 */
public final class FeedLoop {

    /** Feeds of one source usually share a host: after this many network failures in a row, stop. */
    public static final int HOST_DOWN_AFTER = 2;
    private static final Logger log = LoggerFactory.getLogger(FeedLoop.class);

    private FeedLoop() {
    }

    public static RunOutcome run(String label, Connector.Context ctx, HttpFetcher http, FetchStateRepository fetchState,
            ArticleSink sink, Function<SyndEntry, Optional<ArticleCandidate>> mapper) {
        int ok = 0;
        int notModified = 0;
        int failed = 0;
        int entries = 0;
        int notCovered = 0;
        int skipped = 0;
        int networkFailuresInARow = 0;
        Instant newest = null;
        String lastError = null;
        Integer lastErrorStatus = null;
        Map<WriteResult.Kind, Integer> results = new EnumMap<>(WriteResult.Kind.class);

        for (String feed : ctx.source().feeds()) {
            if (networkFailuresInARow >= HOST_DOWN_AFTER) {
                skipped++;
                continue;
            }
            try {
                Map<String, String> headers = fetchState.get(feed)
                        .map(FetchStateRepository.FetchState::conditionalHeaders).orElse(Map.of());
                HttpFetcher.Response response = http.get(URI.create(feed), headers);
                if (response.status() == 304) {
                    notModified++;
                    continue;
                }
                if (response.status() != 200) {
                    throw new HttpFetcher.FetchException("HTTP " + response.status(), response.status(), null);
                }
                SyndFeed parsed = parse(response);
                for (SyndEntry entry : parsed.getEntries()) {
                    entries++;
                    Optional<ArticleCandidate> candidate = mapper.apply(entry);
                    if (candidate.isEmpty()) {
                        notCovered++;
                        continue;
                    }
                    WriteResult result = sink.write(candidate.get());
                    results.merge(result.kind(), 1, Integer::sum);
                    if (result.kind() == WriteResult.Kind.NEW) {
                        Instant t = candidate.get().referenceTime();
                        newest = newest == null || t.isAfter(newest) ? t : newest;
                    }
                }
                fetchState.save(feed, response.header("ETag").orElse(null),
                        response.header("Last-Modified").orElse(null), response.status(), ctx.now());
                ok++;
                networkFailuresInARow = 0;
            } catch (RuntimeException | IOException | FeedException e) {
                failed++;
                boolean hostProblem = e instanceof HttpFetcher.FetchException fe && (fe.status() == 0 || fe.status() >= 500);
                networkFailuresInARow = hostProblem ? networkFailuresInARow + 1 : 0;
                lastError = feed + ": " + e.getMessage();
                lastErrorStatus = e instanceof HttpFetcher.FetchException fe && fe.status() > 0 ? fe.status() : null;
                log.warn("{} feed failed: {}", label, lastError);
            }
        }

        int total = ctx.source().feeds().size();
        int newCount = results.getOrDefault(WriteResult.Kind.NEW, 0);
        Map<String, Object> details = new LinkedHashMap<>();
        details.put("feeds", total);
        details.put("feedsUpdated", ok);
        details.put("feedsNotModified", notModified);
        details.put("feedsFailed", failed);
        details.put("feedsSkippedHostDown", skipped);
        details.put("notAboutCoveredCountries", notCovered);
        results.forEach((kind, n) -> details.put("result." + kind.name().toLowerCase(Locale.ROOT), n));
        log.info("{}: {} feed(s) updated, {} unchanged, {} failed, {} skipped; {} new articles",
                label, ok, notModified, failed, skipped, newCount);

        if (total > 0 && ok + notModified == 0) {
            return new RunOutcome(RunOutcome.Status.FAILED, entries, 0, lastErrorStatus, "FeedError", lastError, null, null, details);
        }
        RunOutcome.Status status = failed > 0 ? RunOutcome.Status.PARTIAL : RunOutcome.Status.SUCCESS;
        return new RunOutcome(status, entries, newCount, null, failed > 0 ? "FeedError" : null, lastError, null, newest, details);
    }

    /** Rejects HTML (e.g. a bot-challenge page) before handing the body to the RSS parser. */
    static SyndFeed parse(HttpFetcher.Response response) throws IOException, FeedException {
        String contentType = response.header("Content-Type").orElse("").toLowerCase(Locale.ROOT);
        String start = new String(response.body(), 0, Math.min(response.body().length, 200), StandardCharsets.UTF_8)
                .stripLeading().toLowerCase(Locale.ROOT);
        // Some publishers (Mainichi) serve RSS as text/html, so the body decides, not the header alone.
        boolean looksLikeHtml = start.startsWith("<!doctype html") || start.startsWith("<html");
        if (looksLikeHtml || (contentType.startsWith("text/html") && !start.startsWith("<?xml") && !start.startsWith("<rss"))) {
            throw new IOException("Expected an RSS feed but got an HTML page");
        }
        SyndFeedInput input = new SyndFeedInput();
        input.setAllowDoctypes(false);
        try (XmlReader reader = new XmlReader(new ByteArrayInputStream(withoutIllegalControlBytes(response.body())))) {
            return input.build(reader);
        }
    }

    /**
     * Drops control characters that XML 1.0 forbids (e.g. a stray 0x08 in one post would
     * otherwise make the whole feed unreadable). Bytes below 0x20 never occur inside multi-byte
     * UTF-8 sequences, so this is safe at byte level. Tab, LF and CR are kept.
     */
    public static byte[] withoutIllegalControlBytes(byte[] body) {
        ByteArrayOutputStream out = new ByteArrayOutputStream(body.length);
        for (byte b : body) {
            if (b >= 0x20 || b < 0 || b == '\t' || b == '\n' || b == '\r') {
                out.write(b);
            }
        }
        return out.toByteArray();
    }
}
