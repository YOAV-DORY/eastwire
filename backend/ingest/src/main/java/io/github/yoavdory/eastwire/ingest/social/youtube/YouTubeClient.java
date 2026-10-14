package io.github.yoavdory.eastwire.ingest.social.youtube;

import io.github.yoavdory.eastwire.ingest.http.HttpFetcher;
import java.net.URI;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/**
 * YouTube Data API v3, two 1-unit calls only: a channel's uploads playlist and video details.
 * {@code search.list} (100 units) is never used. The key is sent in a header, so it never
 * appears in a URL or a log line.
 */
public class YouTubeClient {

    /** videos.list accepts at most this many ids per call. */
    public static final int MAX_IDS = 50;
    private static final JsonMapper JSON = JsonMapper.builder().build();

    /** The daily quota is used up; stop calling until it resets (midnight Pacific time). */
    public static class QuotaExceededException extends RuntimeException {
        private static final long serialVersionUID = 1L;

        QuotaExceededException() {
            super("YouTube API daily quota exceeded");
        }
    }

    /**
     * @param publicAndEmbeddable public, processed, embeddable, not a live or upcoming stream
     */
    public record Video(String id, String channelId, String title, Instant publishedAt, String thumbnailUrl,
            boolean publicAndEmbeddable) {

        public String watchUrl() {
            return "https://www.youtube.com/watch?v=" + id;
        }
    }

    private final HttpFetcher http;
    private final String baseUrl;
    private final String apiKey;

    public YouTubeClient(HttpFetcher http, String baseUrl, String apiKey) {
        this.http = http;
        this.baseUrl = baseUrl.endsWith("/") ? baseUrl : baseUrl + "/";
        this.apiKey = apiKey;
    }

    /** Ids of the channel's latest uploads, newest first. */
    public List<String> latestUploads(String channelId, int max) {
        // Every channel's uploads playlist is its channel id with "UC" replaced by "UU".
        String playlist = "UU" + channelId.substring(2);
        JsonNode body = get("playlistItems?part=contentDetails&maxResults=" + max + "&playlistId=" + enc(playlist));
        List<String> ids = new ArrayList<>();
        body.path("items").forEach(i -> ids.add(i.path("contentDetails").path("videoId").asString()));
        return ids;
    }

    /** Details for up to 50 videos. Deleted or private videos are absent from the answer. */
    public List<Video> videos(List<String> ids) {
        if (ids.isEmpty()) {
            return List.of();
        }
        if (ids.size() > MAX_IDS) {
            throw new IllegalArgumentException("At most " + MAX_IDS + " ids per call");
        }
        JsonNode body = get("videos?part=snippet,status&id=" + enc(String.join(",", ids)));
        List<Video> videos = new ArrayList<>();
        for (JsonNode v : body.path("items")) {
            JsonNode snippet = v.path("snippet");
            JsonNode status = v.path("status");
            boolean ok = "public".equals(status.path("privacyStatus").asString(""))
                    && "processed".equals(status.path("uploadStatus").asString("processed"))
                    && status.path("embeddable").asBoolean(false)
                    && "none".equals(snippet.path("liveBroadcastContent").asString("none"));
            JsonNode thumbs = snippet.path("thumbnails");
            String thumb = thumbs.path("medium").path("url").asString(thumbs.path("default").path("url").asString(""));
            videos.add(new Video(v.path("id").asString(), snippet.path("channelId").asString(), snippet.path("title").asString(""),
                    Instant.parse(snippet.path("publishedAt").asString()), thumb.isEmpty() ? null : thumb, ok));
        }
        return videos;
    }

    private JsonNode get(String path) {
        HttpFetcher.Response response = http.get(URI.create(baseUrl + path),
                Map.of("X-Goog-Api-Key", apiKey, "Accept", "application/json"));
        if (response.status() == 403 && response.text().contains("quotaExceeded")) {
            throw new QuotaExceededException();
        }
        if (response.status() != 200) {
            throw new HttpFetcher.FetchException("HTTP " + response.status() + " from YouTube " + path.replaceFirst("\\?.*", ""),
                    response.status(), null);
        }
        return JSON.readTree(response.body());
    }

    private static String enc(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
    }
}
