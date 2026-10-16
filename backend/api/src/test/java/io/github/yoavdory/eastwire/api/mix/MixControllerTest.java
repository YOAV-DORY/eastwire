package io.github.yoavdory.eastwire.api.mix;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import io.github.yoavdory.eastwire.api.articles.ArticleRepository;
import io.github.yoavdory.eastwire.api.articles.ArticleRow;
import io.github.yoavdory.eastwire.api.articles.ArticleService;
import io.github.yoavdory.eastwire.api.articles.ArticleView;
import java.time.Clock;
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

@WebMvcTest(MixController.class)
@Import(MixControllerTest.FixedClock.class)
class MixControllerTest {

    static final Instant NOW = Instant.parse("2026-10-15T12:00:00Z");

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
    ArticleRepository repository;

    @MockitoBean
    ArticleService articles;

    private static ArticleRow row(long id) {
        return new ArticleRow(id, "s", "t" + id, "https://x.test/" + id, "x.test", null, null, null, null, null, null,
                NOW, NOW, 1, List.of(), List.of(), null, "news", NOW);
    }

    private static ArticleView view(long id, String publisher, String country) {
        List<ArticleView.LocationView> places = country == null ? List.of()
                : List.of(new ArticleView.LocationView("mentioned", "country", "high", "gazetteer", country, null, null, null, true));
        return new ArticleView(id, "t", "u", publisher, "d", new ArticleView.Source("s", "S"), false, NOW, NOW, false,
                null, null, null, places, List.of(), 0, NOW, "news", null, null);
    }

    @Test
    void splitsTheLastDayByCountryAndPublisherCountingOnlyVisibleStories() throws Exception {
        when(repository.find(any())).thenReturn(List.of(row(1), row(2), row(3), row(4)));
        when(articles.toView(any(), any())).thenAnswer(inv -> {
            long id = ((ArticleRow) inv.getArgument(0)).id();
            return switch ((int) id) {
                case 1 -> view(1, "Business Standard", "IN");
                case 2 -> view(2, "Business Standard", "IN");
                case 3 -> view(3, "Korea.net", "KR");
                default -> null; // hidden by the display policy: not counted
            };
        });
        mvc.perform(get("/api/v1/mix"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.windowHours").value(24))
                .andExpect(jsonPath("$.total").value(3))
                .andExpect(jsonPath("$.countries[0].key").value("IN"))
                .andExpect(jsonPath("$.countries[0].count").value(2))
                .andExpect(jsonPath("$.publishers[1].key").value("Korea.net"));
    }
}
