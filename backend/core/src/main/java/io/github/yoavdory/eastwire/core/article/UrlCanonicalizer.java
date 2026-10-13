package io.github.yoavdory.eastwire.core.article;

import java.net.URI;
import java.net.URISyntaxException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.Arrays;
import java.util.Locale;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Two views of an article URL.
 *
 * <ul>
 *   <li>{@link #canonicalUrl}: the link EastWire shows. Tracking parameters and the fragment are
 *       removed and the host is lower-cased, but it stays a working URL.</li>
 *   <li>{@link #dedupeKey}: a more aggressive form used only to detect the same article arriving
 *       twice (www/m/amp variants, http vs https, trailing slash). Its SHA-256 is
 *       {@code article.url_hash}.</li>
 * </ul>
 */
public final class UrlCanonicalizer {

    private static final Set<String> TRACKING_PARAMS = Set.of(
            "fbclid", "gclid", "dclid", "msclkid", "mc_cid", "mc_eid", "ocid", "cmpid", "ref", "ref_src",
            "smid", "outputtype", "_ga", "igshid", "spm", "share", "src");

    private UrlCanonicalizer() {
    }

    /** The link to show. Throws {@link IllegalArgumentException} for anything but http(s) URLs. */
    public static String canonicalUrl(String url) {
        URI uri = parse(url);
        String query = cleanQuery(uri.getRawQuery());
        String path = uri.getRawPath() == null || uri.getRawPath().isEmpty() ? "/" : uri.getRawPath();
        StringBuilder out = new StringBuilder()
                .append(uri.getScheme().toLowerCase(Locale.ROOT)).append("://")
                .append(uri.getHost().toLowerCase(Locale.ROOT));
        if (uri.getPort() != -1 && uri.getPort() != defaultPort(uri.getScheme())) {
            out.append(':').append(uri.getPort());
        }
        out.append(path);
        if (!query.isEmpty()) {
            out.append('?').append(query);
        }
        return out.toString();
    }

    /** Scheme-less, host-normalized form used only for duplicate detection. */
    public static String dedupeKey(String url) {
        URI uri = parse(url);
        String host = uri.getHost().toLowerCase(Locale.ROOT);
        for (String prefix : new String[] {"www.", "m.", "amp.", "mobile."}) {
            if (host.startsWith(prefix)) {
                host = host.substring(prefix.length());
                break;
            }
        }
        String path = uri.getRawPath() == null ? "" : uri.getRawPath();
        path = path.replaceAll("/amp/?$", "/").replaceAll("\\.amp$", "");
        while (path.endsWith("/")) {
            path = path.substring(0, path.length() - 1);
        }
        String query = cleanQuery(uri.getRawQuery());
        return host + path + (query.isEmpty() ? "" : "?" + query);
    }

    /** SHA-256 of the dedupe key (32 bytes), stored as {@code article.url_hash}. */
    public static byte[] hash(String url) {
        try {
            return MessageDigest.getInstance("SHA-256").digest(dedupeKey(url).getBytes(StandardCharsets.UTF_8));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 is always available", e);
        }
    }

    /** Lower-cased host without a leading "www.", as used by the domain policy. */
    public static String domain(String url) {
        String host = parse(url).getHost().toLowerCase(Locale.ROOT);
        return host.startsWith("www.") ? host.substring(4) : host;
    }

    private static URI parse(String url) {
        if (url == null) {
            throw new IllegalArgumentException("url is null");
        }
        try {
            URI uri = new URI(url.strip());
            String scheme = uri.getScheme();
            if (scheme == null || !(scheme.equalsIgnoreCase("http") || scheme.equalsIgnoreCase("https"))
                    || uri.getHost() == null) {
                throw new IllegalArgumentException("not an http(s) url: " + url);
            }
            return uri;
        } catch (URISyntaxException e) {
            throw new IllegalArgumentException("invalid url: " + url, e);
        }
    }

    private static String cleanQuery(String rawQuery) {
        if (rawQuery == null || rawQuery.isEmpty()) {
            return "";
        }
        return Arrays.stream(rawQuery.split("&"))
                .filter(p -> !p.isEmpty())
                .filter(p -> {
                    String name = p.split("=", 2)[0].toLowerCase(Locale.ROOT);
                    return !name.startsWith("utm_") && !TRACKING_PARAMS.contains(name);
                })
                .collect(Collectors.joining("&"));
    }

    private static int defaultPort(String scheme) {
        return "https".equalsIgnoreCase(scheme) ? 443 : 80;
    }
}
