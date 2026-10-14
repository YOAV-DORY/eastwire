package io.github.yoavdory.eastwire.ingest.social.bluesky;

import io.github.yoavdory.eastwire.ingest.http.HttpFetcher;
import java.net.URI;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/**
 * The two public, unauthenticated Bluesky AppView calls EastWire uses: an account's own posts
 * ({@code getAuthorFeed}) and re-checking stored posts ({@code getPosts}, up to 25 at a time).
 * No search: {@code searchPosts} is blocked for us (source matrix, row 10).
 */
public class BlueskyClient {

    /** getPosts accepts at most this many URIs per call. */
    public static final int MAX_URIS = 25;
    private static final JsonMapper JSON = JsonMapper.builder().build();

    /**
     * A post as the AppView returns it.
     *
     * @param labels    moderation labels on the post and on its author
     * @param repost    true if it appeared in the feed as someone else's post reposted
     * @param reply     true if it answers another post
     * @param linkedUrl the external link card's URL, or the first link in the text
     */
    public record Post(String uri, String cid, String authorDid, String authorHandle, Instant createdAt, String text,
            List<String> labels, boolean repost, boolean reply, String linkedUrl) {

        /** The record key, the last part of at://did/app.bsky.feed.post/{rkey}. */
        public String rkey() {
            return uri.substring(uri.lastIndexOf('/') + 1);
        }

        /** The public web address of the post. */
        public String webUrl() {
            return "https://bsky.app/profile/" + authorHandle + "/post/" + rkey();
        }
    }

    private final HttpFetcher http;
    private final String baseUrl;

    public BlueskyClient(HttpFetcher http, String baseUrl) {
        this.http = http;
        this.baseUrl = baseUrl.endsWith("/") ? baseUrl : baseUrl + "/";
    }

    /** The account's latest original posts (no replies), newest first. */
    public List<Post> authorFeed(String did, int limit) {
        JsonNode body = get("app.bsky.feed.getAuthorFeed?actor=" + enc(did) + "&limit=" + limit + "&filter=posts_no_replies");
        List<Post> posts = new ArrayList<>();
        for (JsonNode item : body.path("feed")) {
            boolean repost = item.path("reason").path("$type").asString("").endsWith("reasonRepost");
            posts.add(post(item.path("post"), repost));
        }
        return posts;
    }

    /** Current versions of these posts. Deleted or hidden posts are simply absent. */
    public List<Post> posts(List<String> uris) {
        if (uris.isEmpty()) {
            return List.of();
        }
        if (uris.size() > MAX_URIS) {
            throw new IllegalArgumentException("At most " + MAX_URIS + " URIs per call");
        }
        String query = uris.stream().map(u -> "uris=" + enc(u)).collect(Collectors.joining("&"));
        List<Post> posts = new ArrayList<>();
        for (JsonNode p : get("app.bsky.feed.getPosts?" + query).path("posts")) {
            posts.add(post(p, false));
        }
        return posts;
    }

    static Post post(JsonNode p, boolean repost) {
        JsonNode record = p.path("record");
        List<String> labels = new ArrayList<>();
        p.path("labels").forEach(l -> labels.add(l.path("val").asString()));
        p.path("author").path("labels").forEach(l -> labels.add(l.path("val").asString()));
        return new Post(p.path("uri").asString(), p.path("cid").asString(null), p.path("author").path("did").asString(),
                p.path("author").path("handle").asString(), Instant.parse(record.path("createdAt").asString()),
                record.path("text").asString(""), labels, repost, record.has("reply"), linkedUrl(record));
    }

    private static String linkedUrl(JsonNode record) {
        JsonNode external = record.path("embed").path("external").path("uri");
        if (external.isString()) {
            return external.asString();
        }
        for (JsonNode facet : record.path("facets")) {
            for (JsonNode feature : facet.path("features")) {
                if (feature.path("$type").asString("").endsWith("#link") && feature.path("uri").isString()) {
                    return feature.path("uri").asString();
                }
            }
        }
        return null;
    }

    private JsonNode get(String path) {
        HttpFetcher.Response response = http.get(URI.create(baseUrl + path), Map.of("Accept", "application/json"));
        if (response.status() != 200) {
            throw new HttpFetcher.FetchException("HTTP " + response.status() + " from Bluesky " + path.replaceFirst("\\?.*", ""),
                    response.status(), null);
        }
        return JSON.readTree(response.body());
    }

    private static String enc(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
    }
}
