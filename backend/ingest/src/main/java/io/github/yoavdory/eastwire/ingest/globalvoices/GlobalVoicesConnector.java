package io.github.yoavdory.eastwire.ingest.globalvoices;

import io.github.yoavdory.eastwire.core.config.ComplianceConfig;
import io.github.yoavdory.eastwire.core.geo.Gazetteer;
import io.github.yoavdory.eastwire.ingest.Connector;
import io.github.yoavdory.eastwire.ingest.feeds.FeedLoop;
import io.github.yoavdory.eastwire.ingest.http.FetchStateRepository;
import io.github.yoavdory.eastwire.ingest.http.HttpFetcher;
import io.github.yoavdory.eastwire.ingest.pipeline.ArticleSink;
import io.github.yoavdory.eastwire.ingest.run.RunOutcome;
import java.util.List;
import org.springframework.stereotype.Component;

/**
 * Global Voices country and topic RSS feeds (CC BY 3.0 text). Each feed is fetched with a
 * conditional GET; one failing feed makes the run PARTIAL, all failing makes it fail.
 */
@Component
public class GlobalVoicesConnector implements Connector {

    public static final String SLUG = "global-voices";
    /** All feeds live on one host: after this many network-level failures in a row, stop for this run. */
    static final int HOST_DOWN_AFTER = FeedLoop.HOST_DOWN_AFTER;

    private final HttpFetcher http;
    private final ArticleSink sink;
    private final FetchStateRepository fetchState;
    private final GlobalVoicesMapper mapper;

    public GlobalVoicesConnector(HttpFetcher http, ArticleSink sink, FetchStateRepository fetchState,
            ComplianceConfig config, Gazetteer gazetteer) {
        this.http = http;
        this.sink = sink;
        this.fetchState = fetchState;
        this.mapper = new GlobalVoicesMapper(config, gazetteer);
    }

    @Override
    public String sourceSlug() {
        return SLUG;
    }

    @Override
    public RunOutcome run(Context ctx) {
        // Citizen-media analysis and essays: the source is marked story_type: feature.
        boolean feature = ctx.source().isFeature(List.of());
        return FeedLoop.run("Global Voices", ctx, http, fetchState, sink, entry -> mapper.map(SLUG, entry, ctx.now(), feature));
    }

    /** Kept for tests: see {@link FeedLoop#withoutIllegalControlBytes}. */
    static byte[] withoutIllegalControlBytes(byte[] body) {
        return FeedLoop.withoutIllegalControlBytes(body);
    }
}
