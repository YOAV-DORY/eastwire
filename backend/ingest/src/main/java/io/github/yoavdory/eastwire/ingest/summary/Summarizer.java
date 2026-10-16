package io.github.yoavdory.eastwire.ingest.summary;

import java.util.Optional;

/** Writes EastWire's own one-line summary of a story from the text its feed gave, or nothing. */
public interface Summarizer {

    /** @return a checked summary ({@link SummaryCheck}), or empty when none could be written reliably */
    Optional<String> summarize(String headline, String sourceText);

    /** Recorded with each summary, e.g. "qwen2.5-1.5b-instruct-q4_k_m". */
    String method();

    /** No model configured (local runs, tests): every story keeps its headline alone. */
    Summarizer NONE = new Summarizer() {
        @Override
        public Optional<String> summarize(String headline, String sourceText) {
            return Optional.empty();
        }

        @Override
        public String method() {
            return "none";
        }
    };
}
