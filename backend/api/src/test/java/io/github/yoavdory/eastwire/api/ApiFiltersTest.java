package io.github.yoavdory.eastwire.api;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.concurrent.atomic.AtomicLong;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

class ApiFiltersTest {

    /** A clock the test moves forward by hand. */
    static class ManualClock extends Clock {
        final AtomicLong millis = new AtomicLong(Instant.parse("2026-10-14T12:00:00Z").toEpochMilli());

        @Override
        public ZoneOffset getZone() {
            return ZoneOffset.UTC;
        }

        @Override
        public Clock withZone(java.time.ZoneId zone) {
            return this;
        }

        @Override
        public Instant instant() {
            return Instant.ofEpochMilli(millis.get());
        }
    }

    private static MockHttpServletResponse call(RateLimitFilter filter, String ip, String path) throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", path);
        request.setRemoteAddr(ip);
        MockHttpServletResponse response = new MockHttpServletResponse();
        filter.doFilter(request, response, new MockFilterChain());
        return response;
    }

    @Test
    void limitsEachClientPerMinuteAndSaysWhenToRetry() throws Exception {
        ManualClock clock = new ManualClock();
        RateLimitFilter filter = new RateLimitFilter(3, clock);
        for (int i = 0; i < 3; i++) {
            assertThat(call(filter, "203.0.113.1", "/api/v1/articles").getStatus()).isEqualTo(200);
        }
        clock.millis.addAndGet(20_000);
        MockHttpServletResponse limited = call(filter, "203.0.113.1", "/api/v1/articles");
        assertThat(limited.getStatus()).isEqualTo(429);
        assertThat(limited.getHeader("Retry-After")).isEqualTo("40");
        assertThat(limited.getContentAsString()).contains("Too many requests");

        assertThat(call(filter, "203.0.113.2", "/api/v1/articles").getStatus()).isEqualTo(200);   // other clients unaffected
        assertThat(call(filter, "203.0.113.1", "/api/v1/health").getStatus()).isEqualTo(200);     // health is never limited

        clock.millis.addAndGet(40_000);
        assertThat(call(filter, "203.0.113.1", "/api/v1/articles").getStatus()).isEqualTo(200);   // new window
    }

    @Test
    void jsonResponsesCannotBeFramedSniffedOrRun() throws Exception {
        MockHttpServletResponse response = new MockHttpServletResponse();
        new SecurityHeadersFilter().doFilter(new MockHttpServletRequest("GET", "/api/v1/status"), response, new MockFilterChain());
        assertThat(response.getHeader("Content-Security-Policy")).isEqualTo("default-src 'none'; frame-ancestors 'none'");
        assertThat(response.getHeader("X-Content-Type-Options")).isEqualTo("nosniff");
        assertThat(response.getHeader("Referrer-Policy")).isEqualTo("no-referrer");
    }
}
