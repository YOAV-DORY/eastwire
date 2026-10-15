package io.github.yoavdory.eastwire.ingest.feeds;

import io.github.yoavdory.eastwire.core.config.ComplianceConfig;
import io.github.yoavdory.eastwire.core.geo.Gazetteer;
import io.github.yoavdory.eastwire.ingest.Connector;
import io.github.yoavdory.eastwire.ingest.http.FetchStateRepository;
import io.github.yoavdory.eastwire.ingest.http.HttpFetcher;
import io.github.yoavdory.eastwire.ingest.pipeline.ArticleSink;
import io.github.yoavdory.eastwire.ingest.run.RunOutcome;
import org.springframework.stereotype.Component;

/**
 * Every {@code connector: headline_rss} source in config/sources.yaml: publisher RSS feeds
 * whose terms allow headline links (Mainichi, Sixth Tone, Nippon.com). Stores the headline,
 * link, publisher and publication time; the feed's summary is read only to find places.
 */
@Component
public class HeadlineFeedConnector implements Connector {

    public static final String KEY = "headline_rss";

    private final HttpFetcher http;
    private final ArticleSink sink;
    private final FetchStateRepository fetchState;
    private final HeadlineFeedMapper mapper;

    public HeadlineFeedConnector(HttpFetcher http, ArticleSink sink, FetchStateRepository fetchState,
            ComplianceConfig config, Gazetteer gazetteer) {
        this.http = http;
        this.sink = sink;
        this.fetchState = fetchState;
        this.mapper = new HeadlineFeedMapper(config, gazetteer);
    }

    /** Not a real source slug: this connector is found by {@link #connectorKey()}. */
    @Override
    public String sourceSlug() {
        return "headline-feeds";
    }

    @Override
    public String connectorKey() {
        return KEY;
    }

    @Override
    public RunOutcome run(Context ctx) {
        return FeedLoop.run(ctx.source().name(), ctx, http, fetchState, sink, entry -> mapper.map(ctx.source(), entry, ctx.now()));
    }
}
