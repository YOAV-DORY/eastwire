package io.github.yoavdory.eastwire.api.articles;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(ArticlesController.class)
@Import(QueryValidator.class)
class ArticlesControllerTest {

    @Autowired
    MockMvc mvc;

    @MockitoBean
    ArticleService service;

    @BeforeEach
    void emptyPage() {
        when(service.page(any())).thenReturn(new ArticleView.Page(List.of(), 1, 20, 0, false));
    }

    @Test
    void passesValidFiltersThroughWithAnInclusiveEndDate() throws Exception {
        mvc.perform(get("/api/v1/articles").param("country", "JP").param("city", "1850147").param("sector", "economy")
                        .param("from", "2026-10-01").param("to", "2026-10-13").param("page", "2").param("size", "10"))
                .andExpect(status().isOk())
                .andExpect(header().string("Cache-Control", "max-age=60, public"))
                .andExpect(jsonPath("$.items").isArray());

        ArgumentCaptor<ArticleQuery> query = ArgumentCaptor.forClass(ArticleQuery.class);
        verify(service).page(query.capture());
        org.assertj.core.api.Assertions.assertThat(query.getValue()).isEqualTo(new ArticleQuery("JP", 1850147L,
                Instant.parse("2026-10-01T00:00:00Z"), Instant.parse("2026-10-14T00:00:00Z"), 2, 10, null, ArticleQuery.Sort.DATE,
                "economy"));
    }

    @ParameterizedTest(name = "{0} -> {1}")
    @CsvSource(delimiter = '|', quoteCharacter = '"', value = {
            "country=US|Unknown country 'US'",
            "country=jp|Unknown country 'jp'",
            "city=12345|Unknown city 12345",
            "country=IN&city=1850147|City 1850147 is not in IN",
            "page=0|page must be between 1 and 20",
            "page=21|page must be between 1 and 20",
            "size=51|size must be between 1 and 50",
            "from=2026-10-13&to=2026-10-01|'from' must not be after 'to'",
            "from=yesterday|Invalid value for 'from'",
            "city=abc|Invalid value for 'city'",
            "sector=sport|Unknown sector 'sport'"})
    void rejectsBadInputWithAPlainMessage(String query, String message) throws Exception {
        mvc.perform(get("/api/v1/articles?" + query))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value(message));
    }

    @Test
    void searchPassesNormalizedTextAndSortThrough() throws Exception {
        mvc.perform(get("/api/v1/search").param("q", "  chip   exports ").param("country", "KR").param("sort", "date"))
                .andExpect(status().isOk());

        ArgumentCaptor<ArticleQuery> query = ArgumentCaptor.forClass(ArticleQuery.class);
        verify(service).page(query.capture());
        org.assertj.core.api.Assertions.assertThat(query.getValue())
                .isEqualTo(new ArticleQuery("KR", null, null, null, 1, 20, "chip exports", ArticleQuery.Sort.DATE));
    }

    @Test
    void searchDefaultsToRelevance() throws Exception {
        mvc.perform(get("/api/v1/search").param("q", "\"heat wave\" -Delhi")).andExpect(status().isOk());
        ArgumentCaptor<ArticleQuery> query = ArgumentCaptor.forClass(ArticleQuery.class);
        verify(service).page(query.capture());
        org.assertj.core.api.Assertions.assertThat(query.getValue().sort()).isEqualTo(ArticleQuery.Sort.RELEVANCE);
        org.assertj.core.api.Assertions.assertThat(query.getValue().text()).isEqualTo("\"heat wave\" -Delhi");
    }

    @ParameterizedTest(name = "{0} -> {1}")
    @CsvSource(delimiter = '|', quoteCharacter = '"', value = {
            "|Search text must be 2 to 200 characters",
            "q=a|Search text must be 2 to 200 characters",
            "q=tokyo&sort=popular|sort must be 'relevance' or 'date'",
            "q=tokyo&country=US|Unknown country 'US'"})
    void searchRejectsBadInput(String query, String message) throws Exception {
        mvc.perform(get("/api/v1/search?" + (query == null ? "" : query)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value(message));
    }

    @Test
    void searchRejectsVeryLongText() throws Exception {
        mvc.perform(get("/api/v1/search").param("q", "x".repeat(201))).andExpect(status().isBadRequest());
    }
}
