package io.github.yoavdory.eastwire.api;

import static org.hamcrest.Matchers.everyItem;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest
class ApiControllersTest {

    @Autowired
    MockMvc mvc;

    @Test
    void healthIsOk() throws Exception {
        mvc.perform(get("/api/v1/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("ok"));
    }

    @Test
    void sourcesListsTheMatrixWithEvidence() throws Exception {
        mvc.perform(get("/api/v1/sources"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.slug == 'scmp')].status").value("excluded"))
                .andExpect(jsonPath("$[?(@.slug == 'scmp')].enabled").value(false))
                .andExpect(jsonPath("$[?(@.slug == 'gdelt-gkg')].evidenceCheckedOn").value("2026-10-13"))
                .andExpect(jsonPath("$[*].evidenceUrl", everyItem(org.hamcrest.Matchers.startsWith("https://"))));
    }

    @Test
    void onlyVerifiedSourcesAreEverEnabled() throws Exception {
        mvc.perform(get("/api/v1/sources"))
                .andExpect(jsonPath("$[?(@.enabled == true)].status", not(hasItem("excluded"))))
                .andExpect(jsonPath("$[?(@.enabled == true)].status", not(hasItem("conditional"))));
    }

    @Test
    void theApiIsReadOnly() throws Exception {
        mvc.perform(post("/api/v1/sources")).andExpect(status().isMethodNotAllowed());
    }

    @Test
    void corsAllowsTheFrontendOrigin() throws Exception {
        mvc.perform(options("/api/v1/sources")
                        .header("Origin", "http://localhost:5174")
                        .header("Access-Control-Request-Method", "GET"))
                .andExpect(status().isOk())
                .andExpect(header().string("Access-Control-Allow-Origin", "http://localhost:5174"));
    }

    @Test
    void corsRejectsOtherOrigins() throws Exception {
        mvc.perform(options("/api/v1/sources")
                        .header("Origin", "https://evil.example")
                        .header("Access-Control-Request-Method", "GET"))
                .andExpect(status().isForbidden());
    }
}
