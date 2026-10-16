package io.github.yoavdory.eastwire.ingest.summary;

import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * The checks every generated summary must pass before it is stored. A summary that fails any of
 * them is dropped, and the card shows the headline alone: no summary is better than an invented
 * or copied one.
 *
 * <ul>
 *   <li><b>Shape</b>: one or two sentences, 40 to 240 characters, no "NONE", no first person, no
 *       talk about "the article" or "the text".</li>
 *   <li><b>No copying</b>: shares no run of five words with the publisher's text.</li>
 *   <li><b>Nothing invented</b>: every number and every capitalised name in the summary appears in
 *       the headline or the publisher's text, and so does any judgment ("lacks", "historic") or negation
 *       ("not", "denied") that could change the story's meaning.</li>
 *   <li><b>Adds something</b>: not just the headline again (most of its words are new).</li>
 * </ul>
 */
public final class SummaryCheck {

    static final int MIN_CHARS = 40;
    static final int MAX_CHARS = 240;
    static final int COPY_RUN = 5;

    private static final Pattern WORD = Pattern.compile("[\\p{L}\\p{N}]+(?:['’.-][\\p{L}\\p{N}]+)*");
    private static final Pattern NUMBER = Pattern.compile("\\d[\\d,.]*");
    private static final Pattern NAME = Pattern.compile("(?<![.!?]\\s)(?<!^)\\b\\p{Lu}[\\p{L}'’-]+");
    private static final Pattern BANNED = Pattern.compile("(?i)\\b(NONE|I|we|our|us|this article|the article|the text|"
            + "the headline|the summary|according to the text)\\b");
    /** Judgments a summary may use only when the publisher's text uses them too. */
    private static final Pattern JUDGMENT = Pattern.compile("(?i)\\b(lacks?|lacking|fails?|failed|failure|controversial|"
            + "notable|significant|crucial|important|unfortunately|impressive|landmark|historic|shocking|alarming|"
            + "dramatic|major|massive|huge|unprecedented|substance|criticiz\\w*|slams?|blasts?)\\b");
    /** A negation the source did not make can flip a story's meaning. */
    private static final Pattern NEGATION = Pattern.compile("(?i)\\b(not|no|never|neither|nor|without|denies|denied|"
            + "rejects?|rejected|fails?|failed)\\b");
    private static final Set<String> COMMON_CAPITALS = Set.of("The", "A", "An", "In", "On", "At", "As", "It", "Its", "This",
            "That", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday");

    private SummaryCheck() {
    }

    /** The summary, tidied, if it passes every check; otherwise empty. */
    public static Optional<String> accept(String summary, String headline, String sourceText) {
        if (summary == null) {
            return Optional.empty();
        }
        String s = summary.strip().replaceAll("^[\"'“]|[\"'”]$", "").replaceAll("\\s+", " ").strip();
        if (s.length() < MIN_CHARS || s.length() > MAX_CHARS || BANNED.matcher(s).find()) {
            return Optional.empty();
        }
        if (sentences(s) > 2) {
            return Optional.empty();
        }
        String reference = (headline == null ? "" : headline) + " \n " + (sourceText == null ? "" : sourceText);
        if (copiesRun(s, sourceText)) {
            return Optional.empty();
        }
        if (!numbersFrom(s, reference) || !namesFrom(s, reference) || !judgmentsFrom(s, reference)) {
            return Optional.empty();
        }
        if (onlyTheHeadline(s, headline)) {
            return Optional.empty();
        }
        return Optional.of(s.endsWith(".") ? s : s + ".");
    }

    static int sentences(String s) {
        return s.split("(?<=[.!?])\\s+(?=\\p{Lu})").length;
    }

    /** True when the summary repeats five or more words in a row from the publisher's text. */
    static boolean copiesRun(String summary, String sourceText) {
        if (sourceText == null || sourceText.isBlank()) {
            return false;
        }
        List<String> source = words(sourceText);
        Set<String> runs = new HashSet<>();
        for (int i = 0; i + COPY_RUN <= source.size(); i++) {
            runs.add(String.join(" ", source.subList(i, i + COPY_RUN)));
        }
        List<String> own = words(summary);
        for (int i = 0; i + COPY_RUN <= own.size(); i++) {
            if (runs.contains(String.join(" ", own.subList(i, i + COPY_RUN)))) {
                return true;
            }
        }
        return false;
    }

    static boolean numbersFrom(String summary, String reference) {
        String ref = reference.replace(",", "");
        Matcher m = NUMBER.matcher(summary);
        while (m.find()) {
            String n = m.group().replaceAll("[,.]+$", "").replace(",", "");
            if (!n.isEmpty() && !ref.contains(n)) {
                return false;
            }
        }
        return true;
    }

    static boolean namesFrom(String summary, String reference) {
        String ref = reference.toLowerCase(Locale.ROOT);
        Matcher m = NAME.matcher(summary);
        while (m.find()) {
            String name = m.group();
            if (COMMON_CAPITALS.contains(name)) {
                continue;
            }
            String stem = name.toLowerCase(Locale.ROOT).replaceAll("(’s|'s)$", "");
            // "Chinese" for "China", "Japanese" for "Japan": the first five letters are enough.
            String probe = stem.length() > 6 ? stem.substring(0, 5) : stem;
            if (!ref.contains(probe)) {
                return false;
            }
        }
        return true;
    }

    /** Every judgment word in the summary also appears in the publisher's text or headline. */
    static boolean judgmentsFrom(String summary, String reference) {
        String ref = reference.toLowerCase(Locale.ROOT);
        for (Pattern p : List.of(JUDGMENT, NEGATION)) {
            Matcher m = p.matcher(summary);
            while (m.find()) {
                if (!Pattern.compile("\\b" + Pattern.quote(m.group().toLowerCase(Locale.ROOT)) + "\\b").matcher(ref).find()) {
                    return false;
                }
            }
        }
        return true;
    }

    /** True when at least 80% of the summary's content words are already in the headline. */
    static boolean onlyTheHeadline(String summary, String headline) {
        if (headline == null || headline.isBlank()) {
            return false;
        }
        Set<String> head = new HashSet<>(words(headline));
        List<String> own = words(summary).stream().filter(w -> w.length() > 3).toList();
        if (own.isEmpty()) {
            return true;
        }
        long known = own.stream().filter(head::contains).count();
        return known >= 0.8 * own.size();
    }

    static List<String> words(String text) {
        return WORD.matcher(text.toLowerCase(Locale.ROOT)).results().map(java.util.regex.MatchResult::group).toList();
    }
}
