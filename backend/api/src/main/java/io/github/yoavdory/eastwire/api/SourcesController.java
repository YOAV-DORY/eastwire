package io.github.yoavdory.eastwire.api;

import io.github.yoavdory.eastwire.core.config.ComplianceConfig;
import io.github.yoavdory.eastwire.core.config.SourceConfig;
import java.time.LocalDate;
import java.util.List;
import java.util.Locale;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/** The public source matrix shown on /about/sources. Freshness per source is added in milestone 4. */
@RestController
class SourcesController {

    private final ComplianceConfig config;

    SourcesController(ComplianceConfig config) {
        this.config = config;
    }

    record SourceView(
            String slug,
            String name,
            String kind,
            String status,
            boolean enabled,
            String displayMode,
            String attribution,
            String label,
            String evidenceUrl,
            LocalDate evidenceCheckedOn,
            String evidenceNote) {

        static SourceView of(SourceConfig s) {
            return new SourceView(s.slug(), s.name(), lower(s.kind()), lower(s.status()), s.enabled(),
                    lower(s.displayMode()), s.attribution(), s.label(), s.evidence().url(),
                    s.evidence().checkedOn(), s.evidence().note());
        }

        private static String lower(Enum<?> value) {
            return value.name().toLowerCase(Locale.ROOT);
        }
    }

    @GetMapping("/api/v1/sources")
    List<SourceView> sources() {
        return config.sources().stream().map(SourceView::of).toList();
    }
}
