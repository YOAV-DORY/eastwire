package io.github.yoavdory.eastwire.core.config;

import static org.assertj.core.api.Assertions.assertThat;

import java.nio.file.Path;
import org.junit.jupiter.api.Test;

class QualityRulesTest {

    private static final QualityRules RULES = QualityRules.load(Path.of(System.getProperty(ComplianceConfig.CONFIG_DIR_PROPERTY)));

    @Test
    void pressReleasesAndTrademarkPromotionsAreNotNews() {
        assertThat(RULES.notNewsReason("https://www.business-standard.com/content/press-releases-ani/brand-opens-store-1", "A store opens"))
                .isEqualTo("address contains /press-releases");
        assertThat(RULES.notNewsReason("https://example.in/news/1", "Kyptec LifeStyle® headphones arrive"))
                .isEqualTo("headline contains ®");
    }

    @Test
    void reportingPassesUntouched() {
        assertThat(RULES.notNewsReason("https://www.business-standard.com/industry/banking/bank-q2-profit-rises",
                "Canara Bank Q2 profit rises 8%")).isNull();
    }
}
