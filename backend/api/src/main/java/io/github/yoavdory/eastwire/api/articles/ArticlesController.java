package io.github.yoavdory.eastwire.api.articles;

import io.github.yoavdory.eastwire.api.BadRequestException;
import io.github.yoavdory.eastwire.core.config.ComplianceConfig;
import java.time.Duration;
import java.time.LocalDate;
import java.time.ZoneOffset;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** The story feed: {@code GET /api/v1/articles?country=JP&city=1850147&from=2026-10-01&page=1}. */
@RestController
class ArticlesController {

    private final ArticleService service;
    private final ComplianceConfig config;

    ArticlesController(ArticleService service, ComplianceConfig config) {
        this.service = service;
        this.config = config;
    }

    @GetMapping("/api/v1/articles")
    ResponseEntity<ArticleView.Page> articles(
            @RequestParam(required = false) String country,
            @RequestParam(required = false) Long city,
            @RequestParam(required = false) LocalDate from,
            @RequestParam(required = false) LocalDate to,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "" + ArticleQuery.DEFAULT_SIZE) int size) {
        ArticleQuery query = validate(country, city, from, to, page, size);
        return ResponseEntity.ok()
                .cacheControl(CacheControl.maxAge(Duration.ofSeconds(60)).cachePublic())
                .body(service.page(query));
    }

    ArticleQuery validate(String country, Long city, LocalDate from, LocalDate to, int page, int size) {
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
                page, size);
    }
}
