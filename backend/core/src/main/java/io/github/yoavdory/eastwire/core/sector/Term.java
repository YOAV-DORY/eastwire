package io.github.yoavdory.eastwire.core.sector;

import java.text.Normalizer;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;

/**
 * One keyword or phrase from {@code sectors.yaml}, matched on whole words.
 * A trailing {@code *} lets the last word match any ending ("tariff*" matches "tariffs").
 */
public record Term(String text, List<String> words, boolean prefix) {

    public Term {
        words = List.copyOf(words);
        if (words.isEmpty()) {
            throw new IllegalArgumentException("Empty keyword: '" + text + "'");
        }
    }

    public static Term parse(String text) {
        String raw = text.strip();
        boolean prefix = raw.endsWith("*");
        List<String> words = words(prefix ? raw.substring(0, raw.length() - 1) : raw);
        return new Term(raw, words, prefix);
    }

    /**
     * Lower-cased words with punctuation removed: "AI-powered chips, Seoul's bet" becomes
     * [ai, powered, chips, seoul, s, bet]. Keywords and text go through the same function.
     */
    public static List<String> words(String text) {
        if (text == null || text.isBlank()) {
            return List.of();
        }
        String normal = Normalizer.normalize(text, Normalizer.Form.NFKC).toLowerCase(Locale.ROOT)
                .replaceAll("[^\\p{L}\\p{N}]+", " ")
                .strip();
        return normal.isEmpty() ? List.of() : Arrays.asList(normal.split(" "));
    }

    /** True if the words appear in {@code text} in order and next to each other. */
    public boolean matches(List<String> text) {
        int n = words.size();
        for (int i = 0; i + n <= text.size(); i++) {
            if (matchesAt(text, i)) {
                return true;
            }
        }
        return false;
    }

    private boolean matchesAt(List<String> text, int start) {
        int last = words.size() - 1;
        for (int j = 0; j <= last; j++) {
            String word = text.get(start + j);
            boolean ok = j == last && prefix ? word.startsWith(words.get(j)) : word.equals(words.get(j));
            if (!ok) {
                return false;
            }
        }
        return true;
    }
}
