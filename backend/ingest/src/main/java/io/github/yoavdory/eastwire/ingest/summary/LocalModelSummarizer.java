package io.github.yoavdory.eastwire.ingest.summary;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/**
 * Asks a small open model (Microsoft's Phi-3-mini, MIT licence), served by llama.cpp on the ingest runner (OpenAI-compatible
 * {@code /v1/chat/completions}), for one neutral sentence in its own words, then keeps it only if
 * it passes {@link SummaryCheck}. Nothing leaves the runner: no hosted AI service is called.
 */
public final class LocalModelSummarizer implements Summarizer {

    private static final Logger log = LoggerFactory.getLogger(LocalModelSummarizer.class);
    private static final JsonMapper JSON = JsonMapper.builder().build();

    static final String INSTRUCTIONS = """
            You add context under a news headline. Read the text and pick facts the headline does NOT
            contain: a full name, a number, a date, a place, a reason or a consequence. Write one
            sentence built around those new facts. Do not restate the headline. Use only facts stated
            in the text. Paraphrase: never copy five or more words in a row from the text. No opinions,
            no judgments, no hedging. Under 30 words. Reply with the sentence only. If the text adds
            nothing to the headline, reply NONE.""";

    /** One worked example (invented), so the model sees the length and tone wanted. */
    static final String EXAMPLE_IN = "Headline: Port city opens new ferry route to Busan\nText: FUKUOKA (Kyodo) -- The city of "
            + "Fukuoka will start a daily ferry service to Busan in March, cutting the journey to three hours, officials said on "
            + "Tuesday. The route replaces one suspended in 2020.";
    static final String EXAMPLE_OUT = "Fukuoka's daily service starts in March, takes about three hours and revives a link halted in 2020.";

    /** Columns and editorials are opinion: summarising them risks putting words in the writer's mouth. */
    static final java.util.regex.Pattern OPINION = java.util.regex.Pattern.compile(
            "(?i)^\\s*(Yoroku|Editorial|Opinion|Column|Commentary|Analysis|Letter|Op-ed)\\s*[:：|]");

    private final HttpClient client = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build();
    private final URI endpoint;
    private final String model;

    public LocalModelSummarizer(String baseUrl, String model) {
        this.endpoint = URI.create(baseUrl.replaceAll("/+$", "") + "/v1/chat/completions");
        this.model = model;
    }

    @Override
    public String method() {
        return model;
    }

    @Override
    public Optional<String> summarize(String headline, String sourceText) {
        if (sourceText == null || sourceText.strip().length() < 60 || OPINION.matcher(headline).find()) {
            return Optional.empty();
        }
        String text = sourceText.strip();
        if (text.length() > 1200) {
            text = text.substring(0, 1200);
        }
        Map<String, Object> body = Map.of(
                "model", model,
                "temperature", 0.2,
                "max_tokens", 90,
                // Small models sometimes keep going with notes after the sentence; stop at the first paragraph.
                "stop", List.of("\n\n", "\nFacts", "Solution", "\nNote"),
                "messages", List.of(
                        Map.of("role", "system", "content", INSTRUCTIONS),
                        Map.of("role", "user", "content", EXAMPLE_IN),
                        Map.of("role", "assistant", "content", EXAMPLE_OUT),
                        Map.of("role", "user", "content", "Headline: " + headline + "\nText: " + text)));
        try {
            HttpRequest request = HttpRequest.newBuilder(endpoint)
                    .timeout(Duration.ofSeconds(60))
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(JSON.writeValueAsString(body)))
                    .build();
            HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() != 200) {
                log.warn("Summary model answered HTTP {}", response.statusCode());
                return Optional.empty();
            }
            JsonNode reply = JSON.readTree(response.body()).path("choices").path(0).path("message").path("content");
            String first = reply.asString("").strip().split("\\n", 2)[0];
            return SummaryCheck.accept(first, headline, text);
        } catch (IOException e) {
            log.warn("Summary model unavailable: {}", e.getMessage());
            return Optional.empty();
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            return Optional.empty();
        }
    }
}
