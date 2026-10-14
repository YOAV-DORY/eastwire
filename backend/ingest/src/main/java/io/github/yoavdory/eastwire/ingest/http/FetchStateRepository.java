package io.github.yoavdory.eastwire.ingest.http;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Component;

/** Remembers each feed's ETag / Last-Modified so unchanged feeds come back as a cheap 304. */
@Component
public class FetchStateRepository {

    public record FetchState(String etag, String lastModified) {

        /** The conditional-request headers to send. */
        public Map<String, String> conditionalHeaders() {
            Map<String, String> headers = new LinkedHashMap<>();
            if (etag != null) {
                headers.put("If-None-Match", etag);
            }
            if (lastModified != null) {
                headers.put("If-Modified-Since", lastModified);
            }
            return headers;
        }
    }

    private final JdbcClient jdbc;

    public FetchStateRepository(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    public Optional<FetchState> get(String url) {
        return jdbc.sql("SELECT etag, last_modified FROM fetch_state WHERE url = :url")
                .param("url", url)
                .query((rs, n) -> new FetchState(rs.getString("etag"), rs.getString("last_modified")))
                .optional();
    }

    public void save(String url, String etag, String lastModified, int status, Instant now) {
        jdbc.sql("""
                        INSERT INTO fetch_state (url, etag, last_modified, last_status, last_fetched_at)
                        VALUES (:url, :etag, :lastModified, :status, :now)
                        ON CONFLICT (url) DO UPDATE SET etag = EXCLUDED.etag, last_modified = EXCLUDED.last_modified,
                            last_status = EXCLUDED.last_status, last_fetched_at = EXCLUDED.last_fetched_at
                        """)
                .param("url", url).param("etag", etag).param("lastModified", lastModified)
                .param("status", status).param("now", Timestamp.from(now))
                .update();
    }
}
