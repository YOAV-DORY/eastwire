package io.github.yoavdory.eastwire.core.policy;

import io.github.yoavdory.eastwire.core.config.ComplianceConfig;
import io.github.yoavdory.eastwire.core.config.DisplayMode;
import io.github.yoavdory.eastwire.core.config.DomainDecision;
import io.github.yoavdory.eastwire.core.config.DomainPolicy;
import io.github.yoavdory.eastwire.core.config.SourceConfig;
import io.github.yoavdory.eastwire.core.config.SourceKind;
import io.github.yoavdory.eastwire.core.config.SourceStatus;
import java.net.URI;
import java.util.Arrays;
import java.util.Locale;
import java.util.Optional;
import java.util.Set;

/**
 * Decides what EastWire may show for an item, from the source matrix and the domain review.
 *
 * <p>Order of checks, each one able to hide the item:
 * <ol>
 *   <li>the source must be known, not excluded, enabled, and allowed to display anything;</li>
 *   <li>a denied publisher domain is hidden on every path (excluded publishers stay excluded
 *       even when an item arrives through GDELT or a feed that links to them);</li>
 *   <li>items found through a discovery source need an explicitly allowed domain, inside its
 *       allowed URL prefixes; unreviewed domains are hidden;</li>
 *   <li>excerpts are limited by the source, and dropped for partner reprints and wire copy.</li>
 * </ol>
 */
public final class DisplayPolicy {

    /** Wire services whose copy a publisher's own excerpt permission may not cover. */
    private static final Set<String> WIRE_SERVICES = Set.of(
            "afp", "ap", "jiji", "kyodo", "reuters", "bloomberg", "xinhua", "yonhap");

    private final ComplianceConfig config;

    public DisplayPolicy(ComplianceConfig config) {
        this.config = config;
    }

    public DisplayDecision decide(DisplayRequest request) {
        Optional<SourceConfig> found = config.source(request.sourceSlug());
        if (found.isEmpty()) {
            return DisplayDecision.hidden("unknown source " + request.sourceSlug());
        }
        SourceConfig source = found.get();
        if (source.status() == SourceStatus.EXCLUDED) {
            return DisplayDecision.hidden("source excluded");
        }
        if (!source.enabled()) {
            return DisplayDecision.hidden("source disabled");
        }
        if (source.displayMode() == null || source.displayMode() == DisplayMode.NONE) {
            return DisplayDecision.hidden("source has no display permission");
        }

        URI uri = parse(request.url());
        if (uri == null) {
            return DisplayDecision.hidden("invalid url");
        }
        String host = normalizeHost(uri.getHost());
        Optional<DomainPolicy> domain = config.domainPolicyFor(host);
        if (domain.isPresent() && domain.get().decision() == DomainDecision.DENY) {
            return DisplayDecision.hidden("publisher denied (" + domain.get().rule() + ")");
        }

        if (source.kind() == SourceKind.DISCOVERY) {
            return decideDiscovered(source, domain, uri);
        }
        return decideDirect(source, request);
    }

    private DisplayDecision decideDiscovered(SourceConfig source, Optional<DomainPolicy> domain, URI uri) {
        if (domain.isEmpty() || domain.get().decision() != DomainDecision.ALLOW) {
            return DisplayDecision.hidden("publisher not reviewed");
        }
        String path = uri.getRawPath() == null || uri.getRawPath().isEmpty() ? "/" : uri.getRawPath();
        if (!domain.get().allowsPath(path)) {
            return DisplayDecision.hidden("url outside the publisher's allowed section");
        }
        // Discovered items are headline links only, whatever the source's own display mode says.
        return new DisplayDecision(true, "ok", 0, false, domain.get().publisher(), source.attribution(),
                null, null, null, source.label(), domain.get().publisherLabel());
    }

    private DisplayDecision decideDirect(SourceConfig source, DisplayRequest request) {
        int excerpt = source.displayMode() == DisplayMode.HEADLINE_EXCERPT ? source.maxExcerptChars() : 0;
        // A partner's reprint is not necessarily under the source's license: no excerpt, no license claim.
        boolean partnerReprint = request.partnerReprint() && "link_only".equals(source.partnerReprints());
        if (partnerReprint) {
            excerpt = 0;
        }
        if ("headline_only".equals(source.wireCreditMode()) && isWireCredit(request.credit())) {
            excerpt = 0;
        }
        boolean licensed = source.license() != null && !partnerReprint;
        String publisher = source.publisher() != null ? source.publisher() : source.name();
        return new DisplayDecision(true, "ok", Math.max(excerpt, 0), false, publisher,
                attribution(source.attribution(), request.author()),
                licensed ? source.license().name() : null, licensed ? source.license().url() : null,
                source.excerptNote(), source.label(), source.publisherLabel());
    }

    /** Fills "{author}" in a template; drops the "By {author}, " part when there is no byline. */
    static String attribution(String template, String author) {
        if (template == null) {
            return null;
        }
        if (author == null || author.isBlank()) {
            return template.replace("By {author}, ", "").replace("{author}", "").strip();
        }
        return template.replace("{author}", author.strip());
    }

    static boolean isWireCredit(String credit) {
        if (credit == null || credit.isBlank()) {
            return false;
        }
        return Arrays.stream(credit.toLowerCase(Locale.ROOT).split("[^a-z]+"))
                .anyMatch(WIRE_SERVICES::contains);
    }

    static String normalizeHost(String host) {
        String h = host.toLowerCase(Locale.ROOT);
        return h.startsWith("www.") ? h.substring(4) : h;
    }

    private static URI parse(String url) {
        if (url == null) {
            return null;
        }
        try {
            URI uri = new URI(url.strip());
            String scheme = uri.getScheme();
            boolean web = "https".equalsIgnoreCase(scheme) || "http".equalsIgnoreCase(scheme);
            return web && uri.getHost() != null ? uri : null;
        } catch (java.net.URISyntaxException e) {
            return null;
        }
    }
}
