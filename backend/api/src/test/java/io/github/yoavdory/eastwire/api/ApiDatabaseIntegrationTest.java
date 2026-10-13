package io.github.yoavdory.eastwire.api;

import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.test.web.servlet.MockMvc;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;
import org.testcontainers.utility.DockerImageName;

/**
 * The real SQL against Postgres: filters, expiry, counts and status. The schema comes from the
 * same Flyway migrations the ingest job runs. Needs Docker: skipped locally without it.
 */
@SpringBootTest(properties = {"spring.flyway.enabled=true", "spring.datasource.hikari.read-only=false"})
@AutoConfigureMockMvc
@Testcontainers(disabledWithoutDocker = true)
class ApiDatabaseIntegrationTest {

    @Container
    @ServiceConnection
    static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer(DockerImageName.parse("postgres:17-alpine"));

    @Autowired
    MockMvc mvc;

    @Autowired
    JdbcClient jdbc;

    @BeforeEach
    void seed() {
        jdbc.sql("TRUNCATE article, article_location, story_cluster, source_status, source, place, country RESTART IDENTITY CASCADE").update();
        jdbc.sql("INSERT INTO country VALUES ('JP','JA','Japan',1), ('IN','IN','India',1), ('KR','KS','South Korea',1), ('CN','CH','China',1)").update();
        jdbc.sql("INSERT INTO place (geonames_id, name, ascii_name, country_iso2, lat, lon) VALUES (1850147,'Tokyo','Tokyo','JP',35.69,139.69)").update();
        jdbc.sql("""
                INSERT INTO source (slug, name, kind, status, display_mode, enabled, max_excerpt_chars, attribution)
                VALUES ('gdelt-gkg','GDELT','discovery','verified','headline_only',true,0,'Data: The GDELT Project (gdeltproject.org)'),
                       ('global-voices','Global Voices','news_feed','verified','headline_excerpt',true,300,'By {author}, Global Voices')
                """).update();
        jdbc.sql("""
                INSERT INTO article (source_id, canonical_url, url_hash, domain, title, excerpt, excerpt_kind, display_mode,
                                     discovered_at, published_at, expires_at)
                VALUES (1, 'https://mainichi.jp/english/articles/a', sha256('a'), 'mainichi.jp', 'Tokyo story', NULL, 'none',
                        'headline_only', now() - interval '10 minutes', NULL, now() + interval '30 days'),
                       (2, 'https://globalvoices.org/2026/10/01/b/', sha256('b'), 'globalvoices.org', 'India story',
                        'An excerpt.', 'cc_by_excerpt', 'headline_excerpt', now(), now() - interval '2 days', now() + interval '80 days'),
                       (1, 'https://scroll.in/article/c', sha256('c'), 'scroll.in', 'Expired story', NULL, 'none',
                        'headline_only', now() - interval '40 days', NULL, now() - interval '1 day')
                """).update();
        jdbc.sql("""
                INSERT INTO article_location (article_id, place_id, country_iso2, role, precision, confidence, method, evidence_snippet)
                VALUES (1, 1850147, 'JP', 'mentioned', 'city', 'medium', 'gdelt_gkg', 'Mentions Tokyo'),
                       (1, NULL, 'JP', 'publisher', 'country', 'high', 'source_registry', 'Publisher: The Mainichi'),
                       (2, NULL, 'IN', 'mentioned', 'country', 'high', 'feed_category', 'Filed under India by Global Voices'),
                       (3, NULL, 'IN', 'mentioned', 'country', 'medium', 'gdelt_gkg', 'Mentions India')
                """).update();
    }

    @Test
    void feedIsNewestFirstAndHidesExpiredArticles() throws Exception {
        mvc.perform(get("/api/v1/articles"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total").value(2))
                .andExpect(jsonPath("$.items", hasSize(2)))
                .andExpect(jsonPath("$.items[0].title").value("Tokyo story"))
                .andExpect(jsonPath("$.items[0].publisher").value("The Mainichi (English edition)"))
                .andExpect(jsonPath("$.items[0].viaDiscovery").value(true))
                .andExpect(jsonPath("$.items[0].isNew").value(true))
                .andExpect(jsonPath("$.items[0].locations", hasSize(2)))
                .andExpect(jsonPath("$.items[1].excerpt").value("An excerpt."));
    }

    @Test
    void countryAndCityFiltersMatchWhatTheStoryIsAbout() throws Exception {
        mvc.perform(get("/api/v1/articles").param("country", "JP")).andExpect(jsonPath("$.total").value(1));
        mvc.perform(get("/api/v1/articles").param("city", "1850147"))
                .andExpect(jsonPath("$.items[0].locations[0].placeName").value("Tokyo"));
        mvc.perform(get("/api/v1/articles").param("country", "IN")).andExpect(jsonPath("$.total").value(1));
        mvc.perform(get("/api/v1/articles").param("country", "KR")).andExpect(jsonPath("$.total").value(0));
    }

    @Test
    void countriesCountOnlyLiveArticles() throws Exception {
        mvc.perform(get("/api/v1/countries"))
                .andExpect(jsonPath("$[?(@.iso2 == 'IN')].total").value(1))
                .andExpect(jsonPath("$[?(@.iso2 == 'JP')].last24h").value(1))
                .andExpect(jsonPath("$[?(@.iso2 == 'KR')].total").value(0));
    }

    @Test
    void statusIsUnknownUntilEverySourceHasSucceeded() throws Exception {
        mvc.perform(get("/api/v1/status")).andExpect(jsonPath("$.state").value("unknown"));
        jdbc.sql("""
                INSERT INTO source_status (source_id, last_attempt_at, last_success_at, consecutive_failures)
                VALUES (1, now(), now() - interval '5 minutes', 0), (2, now(), now() - interval '3 hours', 0)
                """).update();
        mvc.perform(get("/api/v1/status"))
                .andExpect(jsonPath("$.state").value("stale"))
                .andExpect(jsonPath("$.sources", hasSize(2)));
    }
}
