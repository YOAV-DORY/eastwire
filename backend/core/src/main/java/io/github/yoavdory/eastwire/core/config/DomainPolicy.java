package io.github.yoavdory.eastwire.core.config;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.time.LocalDate;
import java.util.List;
import java.util.Locale;

/** One entry of {@code config/domains.yaml}. */
@JsonIgnoreProperties(ignoreUnknown = true)
public record DomainPolicy(
        String domain,
        String publisher,
        String country,
        DomainDecision decision,
        String rule,
        List<String> urlPrefixes,
        List<String> conditions,
        String evidenceUrl,
        LocalDate checkedOn,
        String nextAction,
        String publisherLabel) {

    public DomainPolicy {
        domain = domain.toLowerCase(Locale.ROOT);
        urlPrefixes = urlPrefixes == null ? List.of() : List.copyOf(urlPrefixes);
        conditions = conditions == null ? List.of() : List.copyOf(conditions);
    }

    /** True if this entry covers {@code host} itself or one of its subdomains. */
    public boolean covers(String host) {
        return host.equals(domain) || host.endsWith("." + domain);
    }

    /** True if no URL prefixes are set, or {@code path} starts with one of them. */
    public boolean allowsPath(String path) {
        return urlPrefixes.isEmpty() || urlPrefixes.stream().anyMatch(path::startsWith);
    }
}
