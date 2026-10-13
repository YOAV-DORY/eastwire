package io.github.yoavdory.eastwire.api.status;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(StatusController.class)
@Import(StatusControllerTest.FixedClock.class)
class StatusControllerTest {

    static final Instant NOW = Instant.parse("2026-10-13T12:00:00Z");

    @TestConfiguration
    static class FixedClock {
        @Bean
        @Primary
        Clock testClock() {
            return Clock.fixed(NOW, ZoneOffset.UTC);
        }
    }

    @Autowired
    MockMvc mvc;

    @MockitoBean
    StatusRepository repository;

    private static StatusRepository.SourceRow source(String slug, Duration sinceSuccess, int failures) {
        Instant success = sinceSuccess == null ? null : NOW.minus(sinceSuccess);
        return new StatusRepository.SourceRow(slug, NOW.minusSeconds(60), success, success, failures, null, null);
    }

    @Test
    void overallTimeIsTheOldestSuccessSoOneFailingSourceShows() throws Exception {
        when(repository.enabledSources()).thenReturn(List.of(
                source("gdelt-gkg", Duration.ofMinutes(10), 0),
                source("global-voices", Duration.ofHours(5), 3)));

        mvc.perform(get("/api/v1/status"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.state").value("stale"))
                .andExpect(jsonPath("$.lastSuccessAt").value("2026-10-13T07:00:00Z"))
                .andExpect(jsonPath("$.sources[0].state").value("fresh"))
                .andExpect(jsonPath("$.sources[1].name").value("Global Voices"))
                .andExpect(jsonPath("$.sources[1].consecutiveFailures").value(3));
    }

    @Test
    void neverRunIsUnknownNotFresh() throws Exception {
        when(repository.enabledSources()).thenReturn(List.of(source("gdelt-gkg", null, 0)));
        mvc.perform(get("/api/v1/status"))
                .andExpect(jsonPath("$.state").value("unknown"))
                .andExpect(jsonPath("$.lastSuccessAt").doesNotExist());
    }

    @Test
    void classifiesAge() {
        assertThat(StatusController.state(NOW.minus(Duration.ofMinutes(119)), NOW)).isEqualTo("fresh");
        assertThat(StatusController.state(NOW.minus(Duration.ofHours(2)), NOW)).isEqualTo("stale");
        assertThat(StatusController.state(NOW.minus(Duration.ofHours(24)), NOW)).isEqualTo("outage");
        assertThat(StatusController.state(null, NOW)).isEqualTo("unknown");
    }
}
