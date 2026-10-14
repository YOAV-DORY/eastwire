package io.github.yoavdory.eastwire.ingest.run;

import java.time.Duration;
import java.time.Instant;

/**
 * After three failed runs in a row a source is left alone for three hours (about three hourly
 * runs), then tried once more. A success closes the circuit again. This keeps a broken or
 * rate-limiting source from being hammered every hour.
 */
public final class CircuitBreaker {

    public static final int FAILURE_THRESHOLD = 3;
    public static final Duration OPEN_FOR = Duration.ofHours(3);

    private CircuitBreaker() {
    }

    /** When the circuit should reopen after a failure, or null if it stays closed. */
    public static Instant openUntilAfterFailure(int consecutiveFailures, Instant now) {
        return consecutiveFailures >= FAILURE_THRESHOLD ? now.plus(OPEN_FOR) : null;
    }

    public static boolean isOpen(Instant openUntil, Instant now) {
        return openUntil != null && now.isBefore(openUntil);
    }
}
