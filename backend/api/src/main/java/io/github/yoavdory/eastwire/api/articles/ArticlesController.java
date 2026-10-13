package io.github.yoavdory.eastwire.api.articles;

import java.time.Duration;
import java.time.LocalDate;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * The story feed and search:
 * {@code GET /api/v1/articles?country=JP&city=1850147&from=2026-10-01&page=1} and
 * {@code GET /api/v1/search?q=semiconductor exports&country=KR&sort=relevance}.
 */
@RestController
class ArticlesController {

    private final ArticleService service;
    private final QueryValidator validator;

    ArticlesController(ArticleService service, QueryValidator validator) {
        this.service = service;
        this.validator = validator;
    }

    @GetMapping("/api/v1/articles")
    ResponseEntity<ArticleView.Page> articles(
            @RequestParam(required = false) String country,
            @RequestParam(required = false) Long city,
            @RequestParam(required = false) LocalDate from,
            @RequestParam(required = false) LocalDate to,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "" + ArticleQuery.DEFAULT_SIZE) int size) {
        return cached(service.page(validator.feed(country, city, from, to, page, size)));
    }

    /** Full-text search over headlines and permitted excerpts, with the same filters as the feed. */
    @GetMapping("/api/v1/search")
    ResponseEntity<ArticleView.Page> search(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String country,
            @RequestParam(required = false) Long city,
            @RequestParam(required = false) LocalDate from,
            @RequestParam(required = false) LocalDate to,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "" + ArticleQuery.DEFAULT_SIZE) int size,
            @RequestParam(required = false) String sort) {
        return cached(service.page(validator.search(q, country, city, from, to, page, size, sort)));
    }

    private static ResponseEntity<ArticleView.Page> cached(ArticleView.Page page) {
        return ResponseEntity.ok()
                .cacheControl(CacheControl.maxAge(Duration.ofSeconds(60)).cachePublic())
                .body(page);
    }
}
