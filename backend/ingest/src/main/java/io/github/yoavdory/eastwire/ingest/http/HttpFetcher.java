package io.github.yoavdory.eastwire.ingest.http;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpHeaders;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ThreadLocalRandom;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * GET with polite retries: 429 and 5xx responses and network errors are retried with
 * exponential backoff plus jitter, honoring {@code Retry-After}. Everything else (2xx, 304,
 * 404, other 4xx) is returned for the caller to interpret; GDELT's newest file, for example,
 * can be 404 for a few minutes after it is announced.
 */
public class HttpFetcher {

    private static final Logger log = LoggerFactory.getLogger(HttpFetcher.class);

    /** A completed response. */
    public record Response(int status, byte[] body, HttpHeaders headers) {

        public Optional<String> header(String name) {
            return headers.firstValue(name);
        }

        public String text() {
            return new String(body, StandardCharsets.UTF_8);
        }
    }

    /** The request could not be completed, even after retrying. {@code status} is 0 for network errors. */
    public static class FetchException extends RuntimeException {
        private static final long serialVersionUID = 1L;
        private final int status;

        public FetchException(String message, int status, Throwable cause) {
            super(message, cause);
            this.status = status;
        }

        public int status() {
            return status;
        }
    }

    /** Waiting between retries; replaced in tests so they don't sleep. */
    @FunctionalInterface
    public interface Sleeper {
        void sleep(Duration duration) throws InterruptedException;
    }

    private final HttpClient client;
    private final String userAgent;
    private final Duration requestTimeout;
    private final int maxAttempts;
    private final Duration baseDelay;
    private final Duration maxRetryAfter;
    private final Sleeper sleeper;

    public HttpFetcher(String userAgent, Duration requestTimeout, int maxAttempts, Duration baseDelay,
            Duration maxRetryAfter, Sleeper sleeper) {
        this(userAgent, Duration.ofSeconds(20), requestTimeout, maxAttempts, baseDelay, maxRetryAfter, sleeper);
    }

    public HttpFetcher(String userAgent, Duration connectTimeout, Duration requestTimeout, int maxAttempts,
            Duration baseDelay, Duration maxRetryAfter, Sleeper sleeper) {
        this.client = HttpClient.newBuilder()
                .connectTimeout(connectTimeout)
                .followRedirects(HttpClient.Redirect.NORMAL)
                // Some feeds (Korea.net) set a session cookie on a redirect and expect it back;
                // without one they redirect forever. Kept in memory for this run only.
                .cookieHandler(new java.net.CookieManager(null, java.net.CookiePolicy.ACCEPT_ORIGINAL_SERVER))
                .build();
        this.userAgent = userAgent;
        this.requestTimeout = requestTimeout;
        this.maxAttempts = maxAttempts;
        this.baseDelay = baseDelay;
        this.maxRetryAfter = maxRetryAfter;
        this.sleeper = sleeper;
    }

    public Response get(URI uri) {
        return get(uri, Map.of());
    }

    public Response get(URI uri, Map<String, String> headers) {
        HttpRequest.Builder builder = HttpRequest.newBuilder(uri)
                .timeout(requestTimeout)
                .header("User-Agent", userAgent)
                .GET();
        headers.forEach(builder::header);
        HttpRequest request = builder.build();

        for (int attempt = 1; ; attempt++) {
            Duration wait;
            try {
                HttpResponse<byte[]> response = client.send(request, HttpResponse.BodyHandlers.ofByteArray());
                int status = response.statusCode();
                if (!isRetryable(status)) {
                    return new Response(status, response.body(), response.headers());
                }
                if (attempt >= maxAttempts) {
                    throw new FetchException("HTTP " + status + " from " + uri + " after " + attempt + " attempts", status, null);
                }
                wait = response.headers().firstValue("Retry-After")
                        .flatMap(v -> parseRetryAfter(v, Instant.now()))
                        .orElse(backoff(attempt));
                if (wait.compareTo(maxRetryAfter) > 0) {
                    throw new FetchException("HTTP " + status + " from " + uri + "; asked to wait " + wait.toSeconds()
                            + "s, longer than allowed", status, null);
                }
                log.warn("HTTP {} from {} (attempt {}/{}); retrying in {} ms", status, uri, attempt, maxAttempts, wait.toMillis());
            } catch (IOException e) {
                String detail = e.getMessage() != null ? e.getMessage() : e.getClass().getSimpleName();
                if (attempt >= maxAttempts) {
                    throw new FetchException("Network error for " + uri + ": " + detail, 0, e);
                }
                wait = backoff(attempt);
                log.warn("Network error for {} (attempt {}/{}): {}; retrying in {} ms", uri, attempt, maxAttempts,
                        detail, wait.toMillis());
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                throw new FetchException("Interrupted while fetching " + uri, 0, e);
            }
            try {
                sleeper.sleep(wait);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                throw new FetchException("Interrupted while waiting to retry " + uri, 0, e);
            }
        }
    }

    static boolean isRetryable(int status) {
        return status == 429 || (status >= 500 && status <= 504);
    }

    /** Exponential backoff with full jitter: base·2^(n-1) plus up to one base delay. */
    Duration backoff(int attempt) {
        long base = baseDelay.toMillis();
        long exponential = base * (1L << Math.min(attempt - 1, 10));
        return Duration.ofMillis(exponential + ThreadLocalRandom.current().nextLong(base + 1));
    }

    /** Retry-After is either delay-seconds or an HTTP date (RFC 9110 §10.2.3). */
    static Optional<Duration> parseRetryAfter(String value, Instant now) {
        String v = value.strip();
        if (v.matches("\\d{1,9}")) {
            return Optional.of(Duration.ofSeconds(Long.parseLong(v)));
        }
        try {
            Instant at = ZonedDateTime.parse(v, DateTimeFormatter.RFC_1123_DATE_TIME).toInstant();
            Duration d = Duration.between(now, at);
            return Optional.of(d.isNegative() ? Duration.ZERO : d);
        } catch (DateTimeParseException e) {
            return Optional.empty();
        }
    }
}
