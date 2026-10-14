package io.github.yoavdory.eastwire.api;

import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/** Liveness check; the frontend also calls it to wake the free-tier server. */
@RestController
class HealthController {

    @GetMapping("/api/v1/health")
    Map<String, String> health() {
        return Map.of("status", "ok");
    }
}
