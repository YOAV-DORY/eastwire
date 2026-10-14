package io.github.yoavdory.eastwire.ingest.run;

import java.time.Instant;
import java.util.Map;

/**
 * The result of one connector run, as recorded in {@code ingestion_run} and {@code source_status}.
 *
 * @param cursorAfter  where the next run should continue (null keeps the previous cursor)
 * @param newestItemAt time of the newest item written in this run, if any
 * @param details      connector-specific counters shown on /status
 */
public record RunOutcome(
        Status status,
        int itemsSeen,
        int itemsNew,
        Integer httpStatus,
        String errorClass,
        String errorMessage,
        String cursorAfter,
        Instant newestItemAt,
        Map<String, Object> details) {

    public enum Status {
        /** Everything planned was processed. */
        SUCCESS,
        /** Some parts failed (a feed, a gap in GDELT files) but the run still made progress. */
        PARTIAL,
        /** Nothing usable happened. */
        FAILED,
        /** Not attempted, e.g. because the circuit breaker is open. */
        SKIPPED
    }

    public RunOutcome {
        details = details == null ? Map.of() : Map.copyOf(details);
    }

    public boolean madeProgress() {
        return status == Status.SUCCESS || status == Status.PARTIAL;
    }

    public static RunOutcome failed(Throwable error, Integer httpStatus) {
        String message = error.getMessage() == null ? error.getClass().getSimpleName() : error.getMessage();
        return new RunOutcome(Status.FAILED, 0, 0, httpStatus, error.getClass().getSimpleName(),
                message.length() > 500 ? message.substring(0, 500) : message, null, null, Map.of());
    }

    public static RunOutcome skipped(String reason) {
        return new RunOutcome(Status.SKIPPED, 0, 0, null, null, null, null, null, Map.of("reason", reason));
    }
}
