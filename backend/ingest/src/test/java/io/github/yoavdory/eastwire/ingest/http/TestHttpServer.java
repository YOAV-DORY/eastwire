package io.github.yoavdory.eastwire.ingest.http;

import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import java.io.IOException;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.net.URI;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.Function;

/** A local HTTP server for connector tests: stands in for GDELT or a feed, no network needed. */
public final class TestHttpServer implements AutoCloseable {

    /** A canned reply. */
    public record Reply(int status, byte[] body, Map<String, String> headers) {

        public static Reply ok(String body, String contentType) {
            return new Reply(200, body.getBytes(java.nio.charset.StandardCharsets.UTF_8), Map.of("Content-Type", contentType));
        }

        public static Reply ok(byte[] body) {
            return new Reply(200, body, Map.of("Content-Type", "application/octet-stream"));
        }

        public static Reply status(int status) {
            return new Reply(status, new byte[0], Map.of());
        }

        public Reply withHeader(String name, String value) {
            Map<String, String> h = new java.util.HashMap<>(headers);
            h.put(name, value);
            return new Reply(status, body, h);
        }
    }

    /** What the server received, for assertions. {@code query} is the raw query string, or "". */
    public record Request(String path, String query, Map<String, List<String>> headers) {

        public String header(String name) {
            return headers.entrySet().stream()
                    .filter(e -> e.getKey().equalsIgnoreCase(name))
                    .flatMap(e -> e.getValue().stream())
                    .findFirst().orElse(null);
        }
    }

    private final HttpServer server;
    private final Map<String, Function<Request, Reply>> routes = new ConcurrentHashMap<>();
    private final List<Request> requests = Collections.synchronizedList(new ArrayList<>());

    public TestHttpServer() throws IOException {
        server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/", this::handle);
        server.start();
    }

    public TestHttpServer on(String path, Function<Request, Reply> handler) {
        routes.put(path, handler);
        return this;
    }

    public TestHttpServer on(String path, Reply reply) {
        return on(path, r -> reply);
    }

    public URI uri(String path) {
        return URI.create("http://127.0.0.1:" + server.getAddress().getPort() + path);
    }

    public List<Request> requests() {
        return List.copyOf(requests);
    }

    public long count(String path) {
        return requests().stream().filter(r -> r.path().equals(path)).count();
    }

    private void handle(HttpExchange exchange) throws IOException {
        String query = exchange.getRequestURI().getRawQuery();
        Request request = new Request(exchange.getRequestURI().getPath(), query == null ? "" : query,
                Map.copyOf(exchange.getRequestHeaders()));
        requests.add(request);
        Reply reply = routes.getOrDefault(request.path(), r -> Reply.status(404)).apply(request);
        reply.headers().forEach((k, v) -> exchange.getResponseHeaders().add(k, v));
        exchange.sendResponseHeaders(reply.status(), reply.body().length == 0 ? -1 : reply.body().length);
        if (reply.body().length > 0) {
            try (OutputStream out = exchange.getResponseBody()) {
                out.write(reply.body());
            }
        }
        exchange.close();
    }

    @Override
    public void close() {
        server.stop(0);
    }
}
