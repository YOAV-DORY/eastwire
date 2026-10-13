package io.github.yoavdory.eastwire.api.map;

import io.github.yoavdory.eastwire.api.BadRequestException;
import io.github.yoavdory.eastwire.core.config.ComplianceConfig;
import java.time.Duration;
import java.util.Arrays;
import java.util.LinkedHashSet;
import java.util.Locale;
import java.util.Set;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** {@code GET /api/v1/map/cities?window=7d&roles=mentioned,event&country=JP}: pins and country-level counts. */
@RestController
class MapController {

    private static final Set<String> ROLES = Set.of("mentioned", "event", "publisher");

    private final MapService service;
    private final ComplianceConfig config;

    MapController(MapService service, ComplianceConfig config) {
        this.service = service;
        this.config = config;
    }

    @GetMapping("/api/v1/map/cities")
    ResponseEntity<MapService.MapData> cities(
            @RequestParam(defaultValue = "7d") String window,
            @RequestParam(defaultValue = "mentioned,event") String roles,
            @RequestParam(required = false) String country) {
        MapService.Window w = Arrays.stream(MapService.Window.values())
                .filter(v -> v.label().equals(window))
                .findFirst()
                .orElseThrow(() -> new BadRequestException("window must be 24h, 7d or 30d"));
        Set<String> roleSet = new LinkedHashSet<>();
        for (String r : roles.split(",")) {
            String role = r.strip().toLowerCase(Locale.ROOT);
            if (!ROLES.contains(role)) {
                throw new BadRequestException("roles must be a comma-separated subset of mentioned, event, publisher");
            }
            roleSet.add(role);
        }
        if (country != null && config.activeCountries().stream().noneMatch(c -> c.iso2().equals(country))) {
            throw new BadRequestException("Unknown country '" + country + "'");
        }
        return ResponseEntity.ok()
                .cacheControl(CacheControl.maxAge(Duration.ofSeconds(120)).cachePublic())
                .body(service.map(w, roleSet, country));
    }
}
