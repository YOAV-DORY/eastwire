package io.github.yoavdory.eastwire.ingest.run;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import org.junit.jupiter.api.Test;

class CircuitBreakerTest {

    private static final Instant NOW = Instant.parse("2026-10-13T12:00:00Z");

    @Test
    void staysClosedForTheFirstTwoFailures() {
        assertThat(CircuitBreaker.openUntilAfterFailure(1, NOW)).isNull();
        assertThat(CircuitBreaker.openUntilAfterFailure(2, NOW)).isNull();
    }

    @Test
    void opensForThreeHoursAfterTheThirdFailure() {
        Instant until = CircuitBreaker.openUntilAfterFailure(3, NOW);
        assertThat(until).isEqualTo(Instant.parse("2026-10-13T15:00:00Z"));
        assertThat(CircuitBreaker.isOpen(until, NOW.plusSeconds(3600))).isTrue();
        assertThat(CircuitBreaker.isOpen(until, until)).isFalse();
        assertThat(CircuitBreaker.isOpen(null, NOW)).isFalse();
    }
}
