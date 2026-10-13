package io.github.yoavdory.eastwire.ingest.pipeline;

/** Where connectors hand their candidates. The database writer in production; a list in tests. */
@FunctionalInterface
public interface ArticleSink {

    WriteResult write(ArticleCandidate candidate);

    /** What happened to one candidate. */
    record WriteResult(Kind kind, Long articleId, String reason) {

        public enum Kind {
            /** Stored as a new article. */
            NEW,
            /** Already stored (same URL hash). */
            DUPLICATE,
            /** The display policy does not allow showing it. */
            HIDDEN,
            /** Taken down at someone's request. */
            SUPPRESSED,
            /** Older than the source's retention window. */
            TOO_OLD,
            /** Unusable data (bad URL, empty title). */
            INVALID
        }

        public static WriteResult of(Kind kind, String reason) {
            return new WriteResult(kind, null, reason);
        }

        public static WriteResult created(long id) {
            return new WriteResult(Kind.NEW, id, "ok");
        }
    }
}
