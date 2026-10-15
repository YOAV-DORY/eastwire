package io.github.yoavdory.eastwire.api.front;

import io.github.yoavdory.eastwire.api.articles.ArticleQuery;
import io.github.yoavdory.eastwire.api.articles.QueryValidator;
import java.time.Duration;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** {@code GET /api/v1/front}: the ranked front page, optionally for one country, city or sector. */
@RestController
public class FrontPageController {

    private final FrontPageService service;
    private final QueryValidator validator;

    public FrontPageController(FrontPageService service, QueryValidator validator) {
        this.service = service;
        this.validator = validator;
    }

    @GetMapping("/api/v1/front")
    public ResponseEntity<FrontPage> front(
            @RequestParam(required = false) String country,
            @RequestParam(required = false) Long city,
            @RequestParam(required = false) String sector) {
        ArticleQuery q = validator.feed(country, city, sector, null, null, 1, ArticleQuery.DEFAULT_SIZE);
        return ResponseEntity.ok()
                .cacheControl(CacheControl.maxAge(Duration.ofMinutes(2)).cachePublic())
                .body(service.front(q.country(), q.cityId(), q.sector()));
    }
}
