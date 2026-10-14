package io.github.yoavdory.eastwire.ingest;

import io.github.yoavdory.eastwire.core.config.City;
import io.github.yoavdory.eastwire.core.config.ComplianceConfig;
import io.github.yoavdory.eastwire.core.config.Country;
import io.github.yoavdory.eastwire.core.config.DomainPolicy;
import io.github.yoavdory.eastwire.core.config.SourceConfig;
import java.sql.Date;
import java.util.Locale;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Copies config/ into the reference tables so queries can join against it.
 * config/ stays the source of truth: every run overwrites what is in the database.
 */
@Component
public class ConfigSync {

    private final JdbcClient jdbc;

    public ConfigSync(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    public record Result(int countries, int places, int sources, int domains) {
    }

    @Transactional
    public Result sync(ComplianceConfig config) {
        config.countries().forEach(this::upsertCountry);

        Set<String> phase1 = config.countries().stream()
                .filter(c -> c.phase() == 1).map(Country::iso2).collect(Collectors.toSet());
        var cities = config.cities().stream().filter(c -> phase1.contains(c.countryIso2())).toList();
        cities.forEach(this::upsertPlace);
        // Places can be referenced by stored locations, so a city that leaves the list is
        // demoted rather than deleted.
        jdbc.sql("UPDATE place SET is_major_city = (geonames_id = ANY(:ids))")
                .param("ids", cities.stream().map(City::geonamesId).toArray(Long[]::new))
                .update();

        config.sources().forEach(this::upsertSource);
        // A source removed from config must never keep running.
        jdbc.sql("UPDATE source SET enabled = false WHERE slug <> ALL(:slugs)")
                .param("slugs", config.sources().stream().map(SourceConfig::slug).toArray(String[]::new))
                .update();

        config.domains().forEach(this::upsertDomain);
        jdbc.sql("DELETE FROM domain_policy WHERE domain <> ALL(:domains)")
                .param("domains", config.domains().stream().map(DomainPolicy::domain).toArray(String[]::new))
                .update();

        return new Result(config.countries().size(), cities.size(), config.sources().size(), config.domains().size());
    }

    private void upsertCountry(Country c) {
        jdbc.sql("""
                INSERT INTO country (iso2, fips, name, phase) VALUES (:iso2, :fips, :name, :phase)
                ON CONFLICT (iso2) DO UPDATE SET fips = EXCLUDED.fips, name = EXCLUDED.name, phase = EXCLUDED.phase
                """)
                .param("iso2", c.iso2()).param("fips", c.fips()).param("name", c.name()).param("phase", c.phase())
                .update();
    }

    private void upsertPlace(City c) {
        jdbc.sql("""
                INSERT INTO place (geonames_id, name, ascii_name, country_iso2, admin1_code, admin1_name,
                                   lat, lon, population, population_source, feature_code, aliases, is_major_city)
                VALUES (:id, :name, :ascii, :country, :admin1Code, :admin1Name,
                        :lat, :lon, :population, :populationSource, :featureCode, :aliases, true)
                ON CONFLICT (geonames_id) DO UPDATE SET
                    name = EXCLUDED.name, ascii_name = EXCLUDED.ascii_name, country_iso2 = EXCLUDED.country_iso2,
                    admin1_code = EXCLUDED.admin1_code, admin1_name = EXCLUDED.admin1_name,
                    lat = EXCLUDED.lat, lon = EXCLUDED.lon, population = EXCLUDED.population,
                    population_source = EXCLUDED.population_source, feature_code = EXCLUDED.feature_code,
                    aliases = EXCLUDED.aliases, is_major_city = true
                """)
                .param("id", c.geonamesId()).param("name", c.name()).param("ascii", c.asciiName())
                .param("country", c.countryIso2()).param("admin1Code", c.admin1Code())
                .param("admin1Name", c.admin1Name()).param("lat", c.lat()).param("lon", c.lon())
                .param("population", c.population()).param("populationSource", c.populationSource())
                .param("featureCode", c.featureCode()).param("aliases", c.aliasList().toArray(String[]::new))
                .update();
    }

    private void upsertSource(SourceConfig s) {
        jdbc.sql("""
                INSERT INTO source (slug, name, kind, status, display_mode, enabled, max_excerpt_chars, attribution,
                                    publisher_country, publisher_place_id, retention_days, evidence_url,
                                    evidence_checked_on, synced_at)
                VALUES (:slug, :name, :kind, :status, :displayMode, :enabled, :maxExcerpt, :attribution,
                        :publisherCountry, :publisherPlace, :retention, :evidenceUrl, :evidenceDate, now())
                ON CONFLICT (slug) DO UPDATE SET
                    name = EXCLUDED.name, kind = EXCLUDED.kind, status = EXCLUDED.status,
                    display_mode = EXCLUDED.display_mode, enabled = EXCLUDED.enabled,
                    max_excerpt_chars = EXCLUDED.max_excerpt_chars, attribution = EXCLUDED.attribution,
                    publisher_country = EXCLUDED.publisher_country, publisher_place_id = EXCLUDED.publisher_place_id,
                    retention_days = EXCLUDED.retention_days, evidence_url = EXCLUDED.evidence_url,
                    evidence_checked_on = EXCLUDED.evidence_checked_on, synced_at = now()
                """)
                .param("slug", s.slug()).param("name", s.name())
                .param("kind", lower(s.kind())).param("status", lower(s.status()))
                .param("displayMode", lower(s.displayMode())).param("enabled", s.enabled())
                .param("maxExcerpt", s.maxExcerptChars()).param("attribution", s.attribution())
                .param("publisherCountry", s.publisherCountry()).param("publisherPlace", s.publisherCityGeonamesId())
                .param("retention", s.retentionDays()).param("evidenceUrl", s.evidence().url())
                .param("evidenceDate", Date.valueOf(s.evidence().checkedOn()))
                .update();
    }

    private void upsertDomain(DomainPolicy d) {
        jdbc.sql("""
                INSERT INTO domain_policy (domain, publisher, country_iso2, decision, rule, url_prefixes,
                                           evidence_url, checked_on, synced_at)
                VALUES (:domain, :publisher, :country, :decision, :rule, :prefixes, :evidenceUrl, :checkedOn, now())
                ON CONFLICT (domain) DO UPDATE SET
                    publisher = EXCLUDED.publisher, country_iso2 = EXCLUDED.country_iso2,
                    decision = EXCLUDED.decision, rule = EXCLUDED.rule, url_prefixes = EXCLUDED.url_prefixes,
                    evidence_url = EXCLUDED.evidence_url, checked_on = EXCLUDED.checked_on, synced_at = now()
                """)
                .param("domain", d.domain()).param("publisher", d.publisher()).param("country", d.country())
                .param("decision", lower(d.decision())).param("rule", d.rule())
                .param("prefixes", d.urlPrefixes().toArray(String[]::new))
                .param("evidenceUrl", d.evidenceUrl())
                .param("checkedOn", d.checkedOn() == null ? null : Date.valueOf(d.checkedOn()))
                .update();
    }

    private static String lower(Enum<?> value) {
        return value.name().toLowerCase(Locale.ROOT);
    }
}
