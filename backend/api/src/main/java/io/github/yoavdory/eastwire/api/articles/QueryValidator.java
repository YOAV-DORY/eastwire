package io.github.yoavdory.eastwire.api.articles;

import io.github.yoavdory.eastwire.api.BadRequestException;
import io.github.yoavdory.eastwire.core.config.ComplianceConfig;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.Locale;
import org.springframework.stereotype.Component;

/** Turns raw query parameters into an {@link ArticleQuery}, rejecting anything invalid with a plain message. */
@Component
public class QueryValidator {

    public static final int MIN_QUERY_CHARS = 2;
    public static final int MAX_QUERY_CHARS = 200;

    private final ComplianceConfig config;

    public QueryValidator(ComplianceConfig config) {
        this.config = config;
    }

    public ArticleQuery feed(String country, Long city, LocalDate from, LocalDate to, int page, int size) {
        return build(country, city, from, to, page, size, null, ArticleQuery.Sort.DATE);
    }

    public ArticleQuery search(String q, String country, Long city, LocalDate from, LocalDate to, int page, int size,
            String sort) {
        String text = q == null ? "" : q.strip().replaceAll("\\s+", " ");
        if (text.length() < MIN_QUERY_CHARS || text.length() > MAX_QUERY_CHARS) {
            throw new BadRequestException("Search text must be " + MIN_QUERY_CHARS + " to " + MAX_QUERY_CHARS + " characters");
        }
        ArticleQuery.Sort order = switch (sort == null ? "relevance" : sort.toLowerCase(Locale.ROOT)) {
            case "relevance" -> ArticleQuery.Sort.RELEVANCE;
            case "date" -> ArticleQuery.Sort.DATE;
            default -> throw new BadRequestException("sort must be 'relevance' or 'date'");
        };
        return build(country, city, from, to, page, size, text, order);
    }

    private ArticleQuery build(String country, Long city, LocalDate from, LocalDate to, int page, int size, String text,
            ArticleQuery.Sort sort) {
        if (country != null && config.activeCountries().stream().noneMatch(c -> c.iso2().equals(country))) {
            throw new BadRequestException("Unknown country '" + country + "'");
        }
        if (city != null) {
            var match = config.cities().stream().filter(c -> c.geonamesId() == city).findFirst()
                    .orElseThrow(() -> new BadRequestException("Unknown city " + city));
            if (country != null && !match.countryIso2().equals(country)) {
                throw new BadRequestException("City " + city + " is not in " + country);
            }
        }
        if (page < 1 || page > ArticleQuery.MAX_PAGE) {
            throw new BadRequestException("page must be between 1 and " + ArticleQuery.MAX_PAGE);
        }
        if (size < 1 || size > ArticleQuery.MAX_SIZE) {
            throw new BadRequestException("size must be between 1 and " + ArticleQuery.MAX_SIZE);
        }
        if (from != null && to != null && from.isAfter(to)) {
            throw new BadRequestException("'from' must not be after 'to'");
        }
        return new ArticleQuery(country, city,
                from == null ? null : from.atStartOfDay(ZoneOffset.UTC).toInstant(),
                to == null ? null : to.plusDays(1).atStartOfDay(ZoneOffset.UTC).toInstant(),   // 'to' is inclusive
                page, size, text, sort);
    }
}
