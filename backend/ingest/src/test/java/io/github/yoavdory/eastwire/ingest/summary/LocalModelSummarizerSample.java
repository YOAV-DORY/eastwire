package io.github.yoavdory.eastwire.ingest.summary;

import com.rometools.rome.feed.synd.SyndEntry;
import com.rometools.rome.io.SyndFeedInput;
import com.rometools.rome.io.XmlReader;
import io.github.yoavdory.eastwire.ingest.pipeline.Text;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.io.ByteArrayInputStream;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;

/**
 * Opt-in look at real output: with a local llama.cpp server (EASTWIRE_SUMMARY_URL), summarises the
 * newest items of the feeds marked summaries: true and prints each result, kept or rejected.
 * Used by hand and by the "Summary model" workflow to judge the model and the checks
 * (docs/summaries.md); fails when not a single summary passes.
 */
@EnabledIfEnvironmentVariable(named = "EASTWIRE_SUMMARY_URL", matches = ".+")
class LocalModelSummarizerSample {

    @Test
    void printSummariesOfLiveFeedItems() throws Exception {
        Summarizer summarizer = new LocalModelSummarizer(System.getenv("EASTWIRE_SUMMARY_URL"), "phi-3-mini-4k-instruct-q4");
        HttpClient http = HttpClient.newHttpClient();
        int written = 0;
        for (String feed : List.of("https://mainichi.jp/rss/etc/english_latest.rss",
                "https://globalvoices.org/-/world/east-asia/china/feed/", "https://globalvoices.org/-/world/south-asia/india/feed/")) {
            byte[] body = http.send(HttpRequest.newBuilder(URI.create(feed)).header("User-Agent", "EastWireBot/0.1").build(),
                    HttpResponse.BodyHandlers.ofByteArray()).body();
            List<SyndEntry> entries = new SyndFeedInput().build(new XmlReader(new ByteArrayInputStream(body))).getEntries();
            for (SyndEntry e : entries.subList(0, Math.min(10, entries.size()))) {
                String text = e.getDescription() == null ? "" : Text.plain(e.getDescription().getValue());
                var summary = summarizer.summarize(e.getTitle(), text);
                if (summary.isPresent()) {
                    written++;
                }
                System.out.println("\n### " + e.getTitle() + "\n    TEXT: " + (text.length() > 220 ? text.substring(0, 220) + "…" : text)
                        + "\n    SUMMARY: " + summary.orElse("(none: rejected or nothing to add)"));
            }
        }
        // The model and the checks together must produce something on real news, or the setup is broken.
        org.assertj.core.api.Assertions.assertThat(written).as("summaries kept").isPositive();
    }
}
