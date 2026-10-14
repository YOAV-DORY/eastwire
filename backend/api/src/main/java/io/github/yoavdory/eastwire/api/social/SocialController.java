package io.github.yoavdory.eastwire.api.social;

import io.github.yoavdory.eastwire.api.BadRequestException;
import io.github.yoavdory.eastwire.core.config.ComplianceConfig;
import java.time.Duration;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** {@code GET /api/v1/social?platform=bluesky&country=IN&page=1}: curated posts and videos, newest first. */
@RestController
class SocialController {

    private final SocialService service;
    private final ComplianceConfig config;

    SocialController(SocialService service, ComplianceConfig config) {
        this.service = service;
        this.config = config;
    }

    @GetMapping("/api/v1/social")
    ResponseEntity<SocialService.Page> social(
            @RequestParam(required = false) String platform,
            @RequestParam(required = false) String country,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "12") int size) {
        if (platform != null && !SocialService.SOURCE_FOR_PLATFORM.containsKey(platform)) {
            throw new BadRequestException("platform must be 'bluesky' or 'youtube'");
        }
        if (country != null && config.activeCountries().stream().noneMatch(c -> c.iso2().equals(country))) {
            throw new BadRequestException("Unknown country '" + country + "'");
        }
        if (page < 1 || page > SocialService.MAX_PAGE) {
            throw new BadRequestException("page must be between 1 and " + SocialService.MAX_PAGE);
        }
        if (size < 1 || size > SocialService.MAX_SIZE) {
            throw new BadRequestException("size must be between 1 and " + SocialService.MAX_SIZE);
        }
        return ResponseEntity.ok()
                .cacheControl(CacheControl.maxAge(Duration.ofSeconds(60)).cachePublic())
                .body(service.page(platform, country, page, size));
    }
}
