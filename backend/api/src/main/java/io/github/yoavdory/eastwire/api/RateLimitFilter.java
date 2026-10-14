package io.github.yoavdory.eastwire.api;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.time.Clock;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * A per-client request limit for the public API: a fixed one-minute window per IP address.
 * Generous for a reader (a page view makes about six calls) but stops one client from
 * keeping the free-tier server and database busy. Health checks are never limited.
 *
 * <p>Behind Render's proxy the client address comes from X-Forwarded-For, which Tomcat applies
 * when {@code server.forward-headers-strategy} is {@code native}.
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 10)
public class RateLimitFilter extends OncePerRequestFilter {

    /** Above this many tracked clients, windows that already ended are dropped. */
    static final int CLEANUP_AT = 10_000;
    private static final long WINDOW_MS = 60_000;

    private record Window(long startMs, int count) {
    }

    private final int perMinute;
    private final Clock clock;
    private final Map<String, Window> windows = new ConcurrentHashMap<>();

    public RateLimitFilter(@Value("${eastwire.rate-limit.per-minute}") int perMinute, Clock clock) {
        this.perMinute = perMinute;
        this.clock = clock;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getRequestURI();
        return !path.startsWith("/api/") || path.equals("/api/v1/health");
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        long now = clock.millis();
        if (windows.size() > CLEANUP_AT) {
            windows.values().removeIf(w -> now - w.startMs() >= WINDOW_MS);
        }
        Window w = windows.compute(request.getRemoteAddr(), (ip, old) ->
                old == null || now - old.startMs() >= WINDOW_MS ? new Window(now, 1) : new Window(old.startMs(), old.count() + 1));
        if (w.count() > perMinute) {
            long retryAfter = Math.max(1, (w.startMs() + WINDOW_MS - now + 999) / 1000);
            response.setStatus(429);
            response.setHeader("Retry-After", String.valueOf(retryAfter));
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            response.getWriter().write("{\"error\":\"Too many requests. Try again in " + retryAfter + " seconds.\"}");
            return;
        }
        chain.doFilter(request, response);
    }
}
