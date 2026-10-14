package io.github.yoavdory.eastwire.core.geo;

import static org.assertj.core.api.Assertions.assertThat;

import io.github.yoavdory.eastwire.core.config.ComplianceConfig;
import io.github.yoavdory.eastwire.core.config.RepoConfig;
import org.junit.jupiter.api.Test;

class GazetteerTest {

    private static final ComplianceConfig CONFIG = RepoConfig.load();
    private final Gazetteer gazetteer =
            new Gazetteer(CONFIG.cities(), CONFIG.activeCountries(), CONFIG.requiresCountryContext());

    private java.util.List<String> names(String text) {
        return gazetteer.find(text).stream().map(m -> m.city().name()).toList();
    }

    @Test
    void findsCitiesOnWholeWordsInOrder() {
        assertThat(names("Floods in Chennai and Kolkata disrupt rail links")).containsExactly("Chennai", "Kolkata");
        assertThat(names("Delhite? No: Seoulful music")).isEmpty();
    }

    @Test
    void prefersTheLongestName() {
        assertThat(names("Protest in New Delhi grows")).containsExactly("New Delhi");
    }

    @Test
    void usesCuratedAliases() {
        assertThat(names("Old Bombay mills reopen as Bangalore startups expand"))
                .containsExactly("Mumbai", "Bengaluru");
    }

    @Test
    void matchesSpellingsWithAndWithoutMarks() {
        assertThat(names("A new metro line for Urumqi")).containsExactly("Ürümqi");
    }

    @Test
    void wordLikeNamesNeedTheirCountryInTheSameText() {
        assertThat(names("The Saga Continues for Tech Giants")).isEmpty();
        assertThat(names("Heavy snow closes roads in Saga, Japan")).containsExactly("Saga");
        assertThat(gazetteer.find("Heavy snow closes roads in Saga, Japan").getFirst().weak()).isTrue();
        assertThat(names("King Sejong statue restored")).isEmpty();
    }

    @Test
    void countryWordsMatchNamesAndDemonyms() {
        assertThat(gazetteer.mentionsCountry("KR", "A South Korean court ruled")).isTrue();
        assertThat(gazetteer.mentionsCountry("JP", "Japanese exports fell")).isTrue();
        assertThat(gazetteer.mentionsCountry("CN", "Indochina history")).isFalse();
    }

    @Test
    void lookupIgnoresCaseAndAccents() {
        assertThat(gazetteer.lookup("SEOUL")).get().extracting(c -> c.name()).isEqualTo("Seoul");
        assertThat(gazetteer.lookup("OITA")).get().extracting(c -> c.name()).isEqualTo("Ōita");
        assertThat(gazetteer.lookup("Atlantis")).isEmpty();
    }
}
