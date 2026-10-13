package io.github.yoavdory.eastwire.ingest.http;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import io.github.yoavdory.eastwire.ingest.http.TestHttpServer.Reply;
import java.net.URI;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;

class HttpFetcherTest {

    private final TestHttpServer server = newServer();
    private final List<Duration> waits = new ArrayList<>();
    private final HttpFetcher fetcher = new HttpFetcher("EastWireTest/1.0", Duration.ofSeconds(5), 3,
            Duration.ofMillis(100), Duration.ofSeconds(120), waits::add);

    private static TestHttpServer newServer() {
        try {
            return new TestHttpServer();
        } catch (java.io.IOException e) {
            throw new java.io.UncheckedIOException(e);
        }
    }

    @AfterEach
    void stop() {
        server.close();
    }

    @Test
    void sendsItsUserAgentAndReturnsTheBody() {
        server.on("/feed", Reply.ok("hello", "text/plain"));
        HttpFetcher.Response r = fetcher.get(server.uri("/feed"));
        assertThat(r.status()).isEqualTo(200);
        assertThat(r.text()).isEqualTo("hello");
        assertThat(server.requests().getFirst().header("User-Agent")).isEqualTo("EastWireTest/1.0");
    }

    @Test
    void retriesA429HonoringRetryAfter() {
        AtomicInteger calls = new AtomicInteger();
        server.on("/feed", r -> calls.incrementAndGet() == 1
                ? Reply.status(429).withHeader("Retry-After", "7")
                : Reply.ok("ok", "text/plain"));
        assertThat(fetcher.get(server.uri("/feed")).status()).isEqualTo(200);
        assertThat(calls).hasValue(2);
        assertThat(waits).containsExactly(Duration.ofSeconds(7));
    }

    @Test
    void givesUpAfterThreeServerErrorsWithBackoffInBetween() {
        server.on("/feed", Reply.status(503));
        assertThatThrownBy(() -> fetcher.get(server.uri("/feed")))
                .isInstanceOf(HttpFetcher.FetchException.class)
                .satisfies(e -> assertThat(((HttpFetcher.FetchException) e).status()).isEqualTo(503));
        assertThat(server.count("/feed")).isEqualTo(3);
        assertThat(waits).hasSize(2);
        assertThat(waits.get(0)).isBetween(Duration.ofMillis(100), Duration.ofMillis(200));
        assertThat(waits.get(1)).isBetween(Duration.ofMillis(200), Duration.ofMillis(300));
    }

    @Test
    void refusesToWaitLongerThanAllowed() {
        server.on("/feed", Reply.status(429).withHeader("Retry-After", "3600"));
        assertThatThrownBy(() -> fetcher.get(server.uri("/feed")))
                .isInstanceOf(HttpFetcher.FetchException.class)
                .hasMessageContaining("longer than allowed");
        assertThat(server.count("/feed")).isEqualTo(1);
    }

    @Test
    void returnsNotFoundAndNotModifiedToTheCaller() {
        server.on("/old", Reply.status(304));
        assertThat(fetcher.get(server.uri("/missing")).status()).isEqualTo(404);
        assertThat(fetcher.get(server.uri("/old")).status()).isEqualTo(304);
        assertThat(waits).isEmpty();
    }

    @Test
    void networkErrorsAreRetriedThenReportedWithStatusZero() {
        URI closedPort = URI.create("http://127.0.0.1:1/never");
        assertThatThrownBy(() -> fetcher.get(closedPort))
                .isInstanceOf(HttpFetcher.FetchException.class)
                .satisfies(e -> assertThat(((HttpFetcher.FetchException) e).status()).isZero());
        assertThat(waits).hasSize(2);
    }

    @Test
    void parsesBothRetryAfterForms() {
        Instant now = Instant.parse("2026-10-13T12:00:00Z");
        assertThat(HttpFetcher.parseRetryAfter("120", now)).contains(Duration.ofSeconds(120));
        assertThat(HttpFetcher.parseRetryAfter("Tue, 13 Oct 2026 12:01:30 GMT", now)).contains(Duration.ofSeconds(90));
        assertThat(HttpFetcher.parseRetryAfter("Tue, 13 Oct 2026 11:00:00 GMT", now)).contains(Duration.ZERO);
        assertThat(HttpFetcher.parseRetryAfter("soon", now)).isEmpty();
    }
}
