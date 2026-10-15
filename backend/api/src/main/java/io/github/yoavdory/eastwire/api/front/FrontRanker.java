package io.github.yoavdory.eastwire.api.front;

import io.github.yoavdory.eastwire.api.articles.ArticleRow;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.regex.Pattern;

/**
 * Chooses the front page from the news of the last {@link #LATEST_WINDOW}: a lead, two
 * secondary stories and an ordered list. The rules are fixed and explained to readers
 * (docs/ranking.md, the "Why this story" line on each lead):
 *
 * <ol>
 *   <li><b>Freshness</b>: up to 3 points, halving about every 12 hours from publication (or from
 *       when the story was found, if the source gives no time; such stories lose 0.2).</li>
 *   <li><b>Significance</b>: the sector (geopolitics 1, economy and technology 0.8, environment
 *       0.6, society 0.5, business 0.4) and up to 1.2 for other outlets reporting the same story.</li>
 *   <li><b>Broader relevance</b>: 0.8 when the headline names an actor or issue beyond the
 *       country (another government, trade, climate, AI and chips...), 0.5 when the story is about
 *       two or more of the countries we cover.</li>
 *   <li><b>Routine items</b> (index moves, results tables, "stocks to watch") lose 1.5.</li>
 *   <li>A story with no main-subject place loses 1 and can be neither lead nor secondary.</li>
 *   <li><b>Novelty</b>: one story per event (same cluster, or headlines sharing most of their
 *       words); the second and third picks lose 0.8 per earlier pick from the same publisher and
 *       0.4 if they are about the lead's country; no publisher fills more than 40% of the list
 *       or appears three times in a row while others wait.</li>
 * </ol>
 *
 * Nothing here changes a headline or invents a story; it only orders what the sources published.
 */
public final class FrontRanker {

    public static final Duration LATEST_WINDOW = Duration.ofHours(48);
    static final double FRESH_POINTS = 3.0;
    static final double HALF_LIFE_HOURS = 12.0;

    static final Map<String, Double> SECTOR_WEIGHT = Map.of(
            "geopolitics", 1.0, "economy", 0.8, "technology", 0.8, "environment", 0.6, "society", 0.5, "business", 0.4);

    /** Actors and issues that reach beyond the country: why a Western reader might care. */
    static final Pattern INTERNATIONAL = Pattern.compile("(?i)\\b(U\\.?S\\.?|United States|America|American|Washington|"
            + "Europe|European|EU|Britain|British|UK|Russia|Russian|Ukraine|NATO|United Nations|UN|G7|G20|BRICS|"
            + "Pentagon|White House|global|world|tariffs?|trade|exports?|imports?|sanctions?|climate|AI|chips?|"
            + "semiconductors?|nuclear|missiles?|Taiwan|Pakistan|Bangladesh|Middle East|Gaza|Iran)\\b");

    /** Routine market and results items: useful, but not front-page news. */
    static final Pattern ROUTINE = Pattern.compile("(?i)(\\bSensex\\b|\\bNifty\\b|stocks? to (buy|watch)|share price|"
            + "shares? (rise|rises|fall|falls|gain|gains|jump|jumps|slip|slips|surge|surges)|\\bQ[1-4] results?\\b|"
            + "quarterly results|\\bdividend\\b|\\bIPO GMP\\b|market (wrap|close|update)|\\bstock market today\\b)");

    /** Countries we do not cover. A headline about one of them is not lead material for our four. */
    static final Pattern OTHER_COUNTRY = Pattern.compile("(?i)\\b(North Korea|N\\. ?Korea|Pyongyang|Pakistan|Bangladesh|"
            + "Sri Lanka|Nepal|Afghanistan|Myanmar|Taiwan|Philippines|Vietnam|Thailand|Indonesia|Malaysia|Singapore|"
            + "Russia|Ukraine|Iran|Israel|Gaza|Saudi|United States|U\\.S\\.)\\b");

    /** Words that name one of our countries in a headline. */
    static final Pattern COVERED = Pattern.compile("(?i)\\b(China|Chinese|India|Indian|Japan|Japanese|South Korea|"
            + "South Korean|Seoul)\\b|(?<!North )(?<!N\\. )(?<!N\\.)\\bKorean?\\b");

    private static final Set<String> STOPWORDS = Set.of("the", "and", "for", "with", "from", "after", "over", "into",
            "its", "his", "her", "their", "this", "that", "says", "said", "will", "has", "have", "are", "was", "new");

    private FrontRanker() {
    }

    /** A story and how it scored, with the reasons a reader can see. */
    public record Scored(ArticleRow row, double score, List<String> why, String publisher, String country, boolean eligible) {
    }

    public record Selection(Scored lead, List<Scored> secondary, List<Scored> rest, int events) {
    }

    public static Selection select(List<ArticleRow> news, Map<Long, String> publishers, Instant now) {
        List<Scored> scored = news.stream()
                .map(r -> score(r, publishers.getOrDefault(r.id(), r.sourceSlug()), now))
                .sorted(Comparator.comparingDouble(Scored::score).reversed().thenComparing(s -> -s.row().id()))
                .toList();
        List<Scored> events = oneStoryPerEvent(scored);

        List<Scored> pool = new ArrayList<>(events);
        Scored lead = pool.stream().filter(Scored::eligible).findFirst().orElse(null);
        List<Scored> secondary = new ArrayList<>();
        if (lead != null) {
            pool.remove(lead);
            for (int i = 0; i < 2; i++) {
                List<Scored> picked = new ArrayList<>(secondary);
                picked.add(lead);
                Scored next = pool.stream().filter(Scored::eligible)
                        .max(Comparator.comparingDouble(s -> diversified(s, picked, lead)))
                        .orElse(null);
                if (next == null) {
                    break;
                }
                secondary.add(next);
                pool.remove(next);
            }
        }
        return new Selection(lead, List.copyOf(secondary), capPublishers(pool), events.size());
    }

    static double diversified(Scored s, List<Scored> picked, Scored lead) {
        double penalty = 0.8 * picked.stream().filter(p -> p.publisher().equals(s.publisher())).count();
        if (lead != null && !s.country().isEmpty() && s.country().equals(lead.country())) {
            penalty += 0.4;
        }
        return s.score() - penalty;
    }

    static Scored score(ArticleRow r, String publisher, Instant now) {
        List<String> why = new ArrayList<>();
        double score = 0;

        Instant reference = r.referenceTime();
        double hours = Math.max(0, Duration.between(reference, now).toMinutes() / 60.0);
        score += FRESH_POINTS * Math.pow(0.5, hours / HALF_LIFE_HOURS);
        String age = hours < 1 ? "less than an hour ago" : Math.round(hours) + " h ago";
        if (r.publishedAt() != null) {
            why.add("Published " + age);
        } else {
            score -= 0.2;
            why.add("Found " + age + "; the source gives no publication time");
        }

        double sector = r.sectors().stream().mapToDouble(t -> SECTOR_WEIGHT.getOrDefault(t.sector(), 0.0)).max().orElse(0);
        score += sector;
        r.sectors().stream().max(Comparator.comparingDouble(t -> SECTOR_WEIGHT.getOrDefault(t.sector(), 0.0)))
                .ifPresent(t -> why.add(capitalize(t.sector())));

        int others = Math.max(0, r.clusterSize() - 1);
        if (others > 0) {
            score += 0.4 * Math.min(others, 3);
            why.add("Also reported by " + others + (others == 1 ? " other outlet" : " other outlets"));
        }

        Set<String> countries = mainCountries(r);
        var international = INTERNATIONAL.matcher(r.title());
        if (international.find()) {
            score += 0.8;
            why.add("Reaches beyond one country (“" + international.group() + "”)");
        } else if (countries.size() >= 2) {
            score += 0.5;
            why.add("Involves " + countries.size() + " of the countries we cover");
        }

        boolean routine = ROUTINE.matcher(r.title()).find();
        if (routine) {
            score -= 1.5;
            why.add("Routine market item, ranked lower");
        }
        boolean placed = !countries.isEmpty();
        if (!placed) {
            score -= 1.0;
        }
        String country = countries.isEmpty() ? "" : countries.iterator().next();
        boolean foreign = foreignSubject(r);
        if (foreign) {
            score -= 0.5;
            why.add("About a country we do not cover, ranked lower");
        }
        return new Scored(r, score, List.copyOf(why), publisher, country, placed && !routine && !foreign);
    }

    /**
     * True when the headline is about a country we do not cover and names none of ours, e.g.
     * "North Korea says it test-fired missiles" datelined Beijing: the dateline alone does not
     * make it China news for the lead or for a China image.
     */
    static boolean foreignSubject(ArticleRow r) {
        String title = r.title();
        if (!OTHER_COUNTRY.matcher(title).find() || COVERED.matcher(title).find()) {
            return false;
        }
        return r.locations().stream().noneMatch(l -> l.primary() && l.placeName() != null
                && title.toLowerCase(Locale.ROOT).contains(l.placeName().toLowerCase(Locale.ROOT)));
    }

    /** Keeps the best-scoring story of each event: same cluster, or headlines that share most words. */
    static List<Scored> oneStoryPerEvent(List<Scored> bestFirst) {
        List<Scored> kept = new ArrayList<>();
        Set<Long> clusters = new HashSet<>();
        List<Set<String>> titles = new ArrayList<>();
        for (Scored s : bestFirst) {
            Long cluster = s.row().clusterId();
            if (cluster != null && !clusters.add(cluster)) {
                continue;
            }
            Set<String> words = words(s.row().title());
            if (titles.stream().anyMatch(t -> similar(t, words))) {
                continue;
            }
            titles.add(words);
            kept.add(s);
        }
        return kept;
    }

    /** Two headlines report the same event when they share at least half of their content words. */
    static boolean similar(Set<String> a, Set<String> b) {
        if (a.size() < 3 || b.size() < 3) {
            return false;
        }
        Set<String> common = new HashSet<>(a);
        common.retainAll(b);
        Set<String> all = new HashSet<>(a);
        all.addAll(b);
        return (double) common.size() / all.size() >= 0.5;
    }

    static Set<String> words(String title) {
        Set<String> out = new LinkedHashSet<>();
        for (String w : title.toLowerCase(Locale.ROOT).split("[^\\p{L}\\p{N}]+")) {
            if (w.length() >= 3 && !STOPWORDS.contains(w)) {
                out.add(w);
            }
        }
        return out;
    }

    /** Best first, but no publisher above 40% of the list or three times in a row while others wait. */
    static List<Scored> capPublishers(List<Scored> bestFirst) {
        int cap = Math.max(2, (int) Math.ceil(bestFirst.size() * 0.4));
        List<Scored> waiting = new ArrayList<>(bestFirst);
        List<Scored> out = new ArrayList<>();
        Map<String, Integer> counts = new HashMap<>();
        while (!waiting.isEmpty()) {
            Scored next = waiting.stream()
                    .filter(s -> counts.getOrDefault(s.publisher(), 0) < cap && !thirdInARow(out, s.publisher()))
                    .findFirst()
                    .orElse(waiting.getFirst());
            waiting.remove(next);
            out.add(next);
            counts.merge(next.publisher(), 1, Integer::sum);
        }
        return out;
    }

    private static boolean thirdInARow(List<Scored> out, String publisher) {
        int n = out.size();
        return n >= 2 && out.get(n - 1).publisher().equals(publisher) && out.get(n - 2).publisher().equals(publisher);
    }

    /** Countries the story is about: main-subject places, never the publisher's base. */
    static Set<String> mainCountries(ArticleRow r) {
        Set<String> out = new LinkedHashSet<>();
        for (ArticleRow.LocationRow l : r.locations()) {
            if (l.primary() && !"publisher".equals(l.role())) {
                out.add(l.countryIso2());
            }
        }
        return out;
    }

    private static String capitalize(String s) {
        return s.isEmpty() ? s : Character.toUpperCase(s.charAt(0)) + s.substring(1);
    }
}
