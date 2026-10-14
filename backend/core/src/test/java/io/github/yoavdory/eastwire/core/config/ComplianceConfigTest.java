package io.github.yoavdory.eastwire.core.config;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.LocalDate;
import java.util.List;
import org.junit.jupiter.api.Test;

class ComplianceConfigTest {

    private final ComplianceConfig config = RepoConfig.load();

    @Test
    void loadsEverySourceWithStatusAndEvidence() {
        assertThat(config.sources()).isNotEmpty();
        assertThat(config.sources()).allSatisfy(s -> {
            assertThat(s.status()).as(s.slug()).isNotNull();
            assertThat(s.displayMode()).as(s.slug()).isNotNull();
            assertThat(s.evidence().url()).as(s.slug()).startsWith("https://");
            assertThat(s.evidence().checkedOn()).as(s.slug()).isNotNull();
        });
    }

    @Test
    void onlyVerifiedSourcesCanBeEnabled() {
        assertThat(config.sources())
                .filteredOn(SourceConfig::enabled)
                .extracting(SourceConfig::status)
                .containsOnly(SourceStatus.VERIFIED);
    }

    @Test
    void gdeltGkgIsTheEnabledDiscoverySource() {
        SourceConfig gkg = config.source("gdelt-gkg").orElseThrow();
        assertThat(gkg.kind()).isEqualTo(SourceKind.DISCOVERY);
        assertThat(gkg.enabled()).isTrue();
        assertThat(gkg.displayMode()).isEqualTo(DisplayMode.HEADLINE_ONLY);
    }

    @Test
    void domainLookupPrefersTheMostSpecificEntry() {
        assertThat(config.domainPolicyFor("frontline.thehindu.com"))
                .get().extracting(DomainPolicy::domain).isEqualTo("thehindu.com");
        assertThat(config.domainPolicyFor("koreajoongangdaily.joins.com"))
                .get().extracting(DomainPolicy::domain).isEqualTo("koreajoongangdaily.joins.com");
        assertThat(config.domainPolicyFor("example.org")).isEmpty();
        // Suffix matching works on whole labels only: "notscmp.com" is not "scmp.com".
        assertThat(config.domainPolicyFor("notscmp.com")).isEmpty();
    }

    @Test
    void loadsCountriesWithFipsCodes() {
        assertThat(config.countries())
                .filteredOn(c -> c.phase() == 1)
                .extracting(Country::iso2, Country::fips)
                .containsExactlyInAnyOrder(
                        org.assertj.core.groups.Tuple.tuple("CN", "CH"),
                        org.assertj.core.groups.Tuple.tuple("IN", "IN"),
                        org.assertj.core.groups.Tuple.tuple("KR", "KS"),
                        org.assertj.core.groups.Tuple.tuple("JP", "JA"));
    }

    @Test
    void loadsTheCityListWithOneCapitalPerCountry() {
        assertThat(config.cities()).hasSize(170);
        assertThat(config.cities())
                .filteredOn(City::isNationalCapital)
                .extracting(City::name)
                .containsExactlyInAnyOrder("Beijing", "New Delhi", "Seoul", "Tokyo");
        City mumbai = config.cities().stream().filter(c -> c.name().equals("Mumbai")).findFirst().orElseThrow();
        assertThat(mumbai.aliasList()).containsExactly("Bombay");
        assertThat(mumbai.lat()).isBetween(18.0, 20.0);
    }

    @Test
    void refusesAnExcludedSourceThatIsEnabled() {
        SourceConfig scmp = config.source("scmp").orElseThrow();
        assertThatThrownBy(() -> config.withSource(scmp.withEnabled(true)))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("scmp");
    }

    @Test
    void refusesDuplicateDomainEntries() {
        DomainPolicy dup = new DomainPolicy("scmp.com", "dup", "HK", DomainDecision.ALLOW, "A1",
                List.of(), List.of(), "https://example.org", LocalDate.of(2026, 10, 13), null);
        List<DomainPolicy> domains = new java.util.ArrayList<>(config.domains());
        domains.add(dup);
        assertThatThrownBy(() -> new ComplianceConfig(config.sources(), domains, config.countries(), config.cities()))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("scmp.com");
    }
}
