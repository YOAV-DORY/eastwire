package io.github.yoavdory.eastwire.core.sector;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import io.github.yoavdory.eastwire.core.config.ComplianceConfig;
import io.github.yoavdory.eastwire.core.sector.SectorMatch.Kind;
import io.github.yoavdory.eastwire.core.sector.SectorMatch.MatchedRule;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

class SectorClassifierTest {

    /** Six sectors, as the database requires; only two carry rules. */
    private static SectorRules rules(double themeCap, int maxSectors) {
        List<SectorDefinition> sectors = SectorRules.SLUGS.stream().sorted().map(slug -> switch (slug) {
            case "economy" -> new SectorDefinition(slug, "Economy", "Macro.",
                    Map.of("inflation", 3.0, "tariff*", 3.0, "growth", 1.0), Map.of(),
                    Map.of("ECON_INFLATION", 1.0, "ECON_DEBT", 1.0, "ECON_TAX*", 1.0), Map.of("Economics & Business", 1.0));
            case "environment" -> new SectorDefinition(slug, "Environment", "Nature.",
                    Map.of("flood*", 3.0, "climate change", 3.0), Map.of("flood of", 3.0),
                    Map.of(), Map.of("Environment", 3.0));
            default -> new SectorDefinition(slug, slug, "None.", Map.of(), Map.of(), Map.of(), Map.of());
        }).toList();
        return new SectorRules(3, maxSectors, 0.5, themeCap, sectors, "test");
    }

    private final SectorClassifier classifier = new SectorClassifier(rules(2, 2));

    @Test
    void headlineKeywordTagsAtFullWeight() {
        List<SectorMatch> m = classifier.classify("Inflation eases in Japan", null, SectorSignals.NONE);
        assertThat(m).extracting(SectorMatch::sector).containsExactly("economy");
        assertThat(m.getFirst().rules()).containsExactly(new MatchedRule(Kind.KEYWORD, "inflation", "headline", 3.0));
    }

    @Test
    void excerptKeywordCountsHalf() {
        assertThat(classifier.classify("Prices in Japan", "Inflation eased in September.", SectorSignals.NONE)).isEmpty();
        assertThat(classifier.classify("Prices in Japan", "Inflation and climate change.", SectorSignals.NONE)).isEmpty();
        List<SectorMatch> both = classifier.classify("Japan's growth", "Inflation eased; tariffs rose.", SectorSignals.NONE);
        assertThat(both).singleElement().satisfies(s -> assertThat(s.score()).isEqualTo(4.0));   // 1 + 1.5 + 1.5
    }

    @Test
    void prefixMatchesWordEndingsButNotOtherWords() {
        assertThat(classifier.classify("New tariffs on steel", null, SectorSignals.NONE)).hasSize(1);
        assertThat(classifier.classify("Floods hit Assam", null, SectorSignals.NONE)).hasSize(1);
        assertThat(classifier.classify("A tariffless future", null, SectorSignals.NONE)).hasSize(1);
        assertThat(classifier.classify("Tarif talk", null, SectorSignals.NONE)).isEmpty();
    }

    @Test
    void negativePhraseCancelsAMatch() {
        List<SectorMatch> m = classifier.classify("A flood of cheap steel", null, SectorSignals.NONE);
        assertThat(m).isEmpty();
    }

    @Test
    void themesAloneCannotPassTheThreshold() {
        SectorSignals themes = SectorSignals.themes(Set.of("ECON_INFLATION", "ECON_DEBT", "ECON_TAXATION"));
        assertThat(classifier.classify("Japan in October", null, themes)).isEmpty();   // 3 themes, capped at 2

        List<SectorMatch> withKeyword = classifier.classify("Japan's growth", null, themes);
        assertThat(withKeyword).singleElement().satisfies(s -> {
            assertThat(s.score()).isEqualTo(3.0);
            assertThat(s.rules()).extracting(MatchedRule::value)   // Map.of here has no order; sectors.yaml keeps its own
                    .containsExactlyInAnyOrder("growth", "ECON_INFLATION", "ECON_DEBT", "ECON_TAXATION");
        });
    }

    @Test
    void feedCategoryMatchesIgnoringCase() {
        List<SectorMatch> m = classifier.classify("A village story", null, SectorSignals.categories(Set.of("environment")));
        assertThat(m).extracting(SectorMatch::sector).containsExactly("environment");
        assertThat(m.getFirst().rules()).containsExactly(new MatchedRule(Kind.FEED_CATEGORY, "Environment", null, 3.0));
    }

    @Test
    void keepsTheHighestScoresUpToTheLimit() {
        SectorClassifier one = new SectorClassifier(rules(2, 1));
        List<SectorMatch> m = one.classify("Floods and climate change raise inflation", null, SectorSignals.NONE);
        assertThat(m).extracting(SectorMatch::sector).containsExactly("environment");   // 6 beats 3
        assertThat(classifier.classify("Floods and climate change raise inflation", null, SectorSignals.NONE))
                .extracting(SectorMatch::sector).containsExactly("environment", "economy");
    }

    @Test
    void wordsIgnorePunctuationAndCase() {
        assertThat(Term.words("AI-powered chips, Seoul's bet!")).containsExactly("ai", "powered", "chips", "seoul", "s", "bet");
        assertThat(Term.parse("people's bank").matches(Term.words("The People’s Bank acts"))).isTrue();
        assertThat(Term.words(null)).isEmpty();
    }

    @Test
    void repoRulesLoadAndHaveAVersion() {
        SectorRules repo = SectorRules.load(Path.of(System.getProperty(ComplianceConfig.CONFIG_DIR_PROPERTY)));
        assertThat(repo.sectors()).extracting(SectorDefinition::slug).containsExactlyInAnyOrderElementsOf(SectorRules.SLUGS);
        assertThat(repo.version()).hasSize(12);
        assertThat(repo.sector("economy")).get().extracting(SectorDefinition::label).isEqualTo("Economy");
    }

    @Test
    void rejectsUnknownSectorsTyposAndDuplicates(@TempDir Path dir) throws IOException {
        String base = Files.readString(Path.of(System.getProperty(ComplianceConfig.CONFIG_DIR_PROPERTY), "sectors.yaml"));

        Files.writeString(dir.resolve("sectors.yaml"), base.replace("slug: economy", "slug: sport"));
        assertThatThrownBy(() -> SectorRules.load(dir)).hasMessageContaining("Sectors must be exactly");

        Files.writeString(dir.resolve("sectors.yaml"), base.replace("    keywords:\n      economy: 3", "    keyword:\n      economy: 3"));
        assertThatThrownBy(() -> SectorRules.load(dir)).isInstanceOf(IllegalStateException.class);

        Files.writeString(dir.resolve("sectors.yaml"), base.replace("      inflation: 3\n", "      inflation: 3\n      inflation: 2\n"));
        assertThatThrownBy(() -> SectorRules.load(dir)).hasMessageContaining("inflation");

        Files.writeString(dir.resolve("sectors.yaml"), base.replace("      inflation: 3\n", "      inflation: 0\n"));
        assertThatThrownBy(() -> SectorRules.load(dir)).hasMessageContaining("must be positive");
    }
}
