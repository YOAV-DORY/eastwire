package io.github.yoavdory.eastwire.ingest;

import io.github.yoavdory.eastwire.core.config.SourceConfig;
import io.github.yoavdory.eastwire.ingest.run.RunOutcome;
import java.time.Instant;

/** One source's ingestion logic. Implementations must not throw for partial problems; report PARTIAL. */
public interface Connector {

    /** The {@code slug} in config/sources.yaml this connector serves. */
    String sourceSlug();

    /**
     * The {@code connector} key of config/sources.yaml entries this connector serves when one
     * implementation handles several sources (e.g. every {@code headline_rss} feed), else null.
     */
    default String connectorKey() {
        return null;
    }

    RunOutcome run(Context context);

    /**
     * @param cursor where the previous successful run stopped (connector-specific), or null
     */
    record Context(SourceConfig source, short sourceId, String cursor, Instant now) {
    }
}
