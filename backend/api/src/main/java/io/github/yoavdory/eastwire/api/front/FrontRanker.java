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
 * secondary stories and an ordered list, ranked by importance for a reader outside the region.
 * The rules are fixed and explained to readers (docs/ranking.md, the "Why it leads" line):
 *
 * <ol>
 *   <li><b>Coverage</b>: +0.6 per other outlet reporting the same event, up to +1.8.</li>
 *   <li><b>Impact</b>: security (missiles, troops, sanctions...) +1.2; a big market move (an
 *       index's record or largest drop, a currency's slide) +1.0; macro policy (rates, tariffs,
 *       export controls, trade deals) +0.8.</li>
 *   <li><b>Recency</b>: up to 2 points, halving about every 12 hours (stories with no
 *       publication time lose 0.2).</li>
 *   <li><b>Sector and reach</b>: the sector (geopolitics 1 ... business 0.4); +0.8 when the
 *       headline names an actor or issue beyond the country, +0.4 more for the United States;
 *       +0.5 when it is about two of our countries.</li>
 *   <li><b>Lower</b>: routine market items −1.5; soft company news (training, hiring, launches,
 *       awards, donations) −0.8 unless it has impact; a story with no main-subject place −1 and
 *       never lead.</li>
 *   <li><b>Diversity</b>: one story per event; the lead avoids the previous lead's country (−1);
 *       the next two picks lose 0.8 per earlier pick from the same publisher and 0.6 for the
 *       lead's country; in the ordered list no country takes more than 40% and no publisher more
 *       than 25% of any stretch from the top, while others wait.</li>
 * </ol>
 *
 * North Korea's missiles and nuclear tests are Korean Peninsula security news and count as about
 * South Korea; other stories about countries we do not cover rank lower.
 * Nothing here changes a headline or invents a story; it only orders what the sources published.
 */
public final class FrontRanker {

    public static final Duration LATEST_WINDOW = Duration.ofHours(48);
    static final double FRESH_POINTS = 2.0;
    static final double COUNTRY_SHARE = 0.4;
    static final double PUBLISHER_SHARE = 0.25;
    static final double HALF_LIFE_HOURS = 12.0;

    static final Map<String, Double> SECTOR_WEIGHT = Map.of(
            "geopolitics", 1.0, "economy", 0.8, "technology", 0.8, "environment", 0.6, "society", 0.5, "business", 0.4);

    /** Actors and issues that reach beyond the country: why a Western reader might care. */
    static final Pattern INTERNATIONAL = Pattern.compile("(?i)\\b(U\\.?S\\.?|United States|America|American|Washington|"
            + "Europe|European|EU|Britain|British|UK|Russia|Russian|Ukraine|NATO|United Nations|UN|G7|G20|BRICS|"
            + "Pentagon|White House|global|world|tariffs?|trade|exports?|imports?|sanctions?|climate|AI|chips?|"
            + "semiconductors?|nuclear|missiles?|Taiwan|Pakistan|Bangladesh|Middle East|Gaza|Iran)\\b");

    /** Security and defence: what a reader abroad most needs to know. */
    static final Pattern SECURITY = Pattern.compile("(?i)\\b(missiles?|ballistic|nuclear (test|tests|weapons?|arsenal|"
            + "threat)|warheads?|troops|warships?|fighter jets?|military (drills?|exercises?|buildup|threat|strike)|war games|"
            + "clash(es|ed)?|border (clash|clashes|tension|tensions|standoff)|attack(s|ed)? on|sanctions?|espionage|spy|spies|"
            + "cyberattacks?|war(?!\\s+(criminals?|crimes?|memorial|museum|dead|veterans?|history))|ceasefire|invasion|coast guard (vessels?|ships?)|defen[cs]e (minister|ministry|spending|pact|budget))\\b");

    /** A market move big enough to matter outside the country: a record, the largest move, a crash. */
    static final Pattern MARKET_MOVE = Pattern.compile("(?i)\\b(Nikkei|Topix|Sensex|Nifty|Kospi|Kosdaq|Hang Seng|"
            + "Shanghai Composite|CSI 300|yen|yuan|rupee|won|stocks?|shares|markets?)\\b.{0,60}\\b(record (high|low)|"
            + "all-time (high|low)|largest|biggest|worst|steepest|crash(es|ed)?|black (monday|tuesday|wednesday|thursday|friday))\\b"
            + "|\\b(record|largest|biggest|worst|steepest)\\b.{0,40}\\b(drop|fall|decline|loss|gain|rally|sell-?off|plunge)\\b");

    /** Macro policy: rates, trade and export rules. */
    static final Pattern POLICY = Pattern.compile("(?i)\\b(interest rates?|rate (hike|cut)|central bank|Bank of Japan|BOJ|"
            + "Reserve Bank|RBI|PBOC|People's Bank|Bank of Korea|inflation|GDP|recession|tariffs?|export controls?|"
            + "trade (deal|pact|war|talks|surplus|deficit)|stimulus|budget)\\b");

    /** The United States named in the headline: the reader this site is written for. */
    static final Pattern UNITED_STATES = Pattern.compile("(?<![\\w.])(U\\.S\\.|US|USA|United States|America|American|"
            + "Washington|Trump|White House|Pentagon)(?![\\w])");

    /** Company housekeeping: real, but rarely what matters most that day. */
    static final Pattern SOFT = Pattern.compile("(?i)\\b(to train|trains?|training|to hire|hires?|hiring|recruit(s|ing)?|"
            + "appoints?|names new|partnership|MoU|memorandum|ties up|launch(es)? (an? )?(app|service|campaign|program)|"
            + "opens? (a |its )?(store|office|showroom)|celebrat(es|ing)|awards?|festival|ceremony|exhibition|"
            + "donat(es|ion)|scholarships?|charity|anniversary)\\b");

    /** North Korea's weapons: Korean Peninsula security, so about South Korea for our purposes. */
    static final Pattern NORTH_KOREA = Pattern.compile("(?i)\\b(North Korea|N\\. ?Korea|Pyongyang|DPRK|Kim Jong[- ]Un)\\b");

    /** Opinion, columns, reviews and lifestyle, by the publisher's own URL section or headline label: never the lead. */
    static final Pattern OPINION = Pattern.compile("(?i)(/(opinion|opinions|columns?|columnists?|editorials?|blogs?|"
            + "op-?eds?|commentary|views|letters|books?|book-reviews?|reviews?|lifestyle|travel|food|horoscopes?|puzzles?)/)|^\\s*(Editorial|Opinion|Column|Commentary|Op-ed|Yoroku|Analysis|View)\\s*[:：|]");

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
        return select(news, publishers, now, null);
    }

    /**
     * @param previousLeadCountry the country the front page led with an hour earlier, or null: the
     *                            lead avoids leading with the same country twice in a row
     */
    public static Selection select(List<ArticleRow> news, Map<Long, String> publishers, Instant now,
            String previousLeadCountry) {
        List<Scored> scored = news.stream()
                .map(r -> score(r, publishers.getOrDefault(r.id(), r.sourceSlug()), now))
                .sorted(Comparator.comparingDouble(Scored::score).reversed().thenComparing(s -> -s.row().id()))
                .toList();
        List<Scored> events = oneStoryPerEvent(scored);

        List<Scored> pool = new ArrayList<>(events);
        Scored lead = pool.stream().filter(Scored::eligible)
                .max(Comparator.comparingDouble((Scored s) -> leadScore(s, previousLeadCountry))
                        .thenComparing(s -> s.row().id()))
                .orElse(null);
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
        return new Selection(lead, List.copyOf(secondary), balance(pool), events.size());
    }

    /** The lead's score: its own, less 1 if the previous lead was about the same country. */
    static double leadScore(Scored s, String previousLeadCountry) {
        return s.score() - (previousLeadCountry != null && previousLeadCountry.equals(s.country()) ? 1.0 : 0);
    }

    static double diversified(Scored s, List<Scored> picked, Scored lead) {
        double penalty = 0.8 * picked.stream().filter(p -> p.publisher().equals(s.publisher())).count();
        if (lead != null && !s.country().isEmpty() && s.country().equals(lead.country())) {
            penalty += 0.6;
        }
        return s.score() - penalty;
    }

    static Scored score(ArticleRow r, String publisher, Instant now) {
        List<String> why = new ArrayList<>();
        double score = 0;
        String title = r.title();

        int others = Math.max(0, r.clusterSize() - 1);
        if (others > 0) {
            score += 0.6 * Math.min(others, 3);
            why.add("Reported by " + (others + 1) + " outlets");
        }

        boolean security = SECURITY.matcher(title).find();
        boolean market = MARKET_MOVE.matcher(title).find();
        boolean policy = POLICY.matcher(title).find();
        if (security) {
            score += 1.2;
            why.add("Security");
        }
        if (market) {
            score += 1.0;
            why.add("Market move");
        } else if (policy) {
            score += 0.8;
            why.add("Economic policy");
        }

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

        Set<String> countries = mainCountries(r);
        boolean northKoreaSecurity = security && NORTH_KOREA.matcher(title).find();
        if (northKoreaSecurity && countries.isEmpty()) {
            countries = Set.of("KR");
        }
        var international = INTERNATIONAL.matcher(title);
        if (international.find()) {
            score += 0.8;
            why.add("Reaches beyond one country (“" + international.group() + "”)");
            if (UNITED_STATES.matcher(title).find()) {
                score += 0.4;
            }
        } else if (countries.size() >= 2) {
            score += 0.5;
            why.add("Involves " + countries.size() + " of the countries we cover");
        }

        boolean routine = ROUTINE.matcher(title).find() && !market;
        if (routine) {
            score -= 1.5;
            why.add("Routine market item, ranked lower");
        }
        if (!security && !market && !policy && SOFT.matcher(title).find()) {
            score -= 0.8;
            why.add("Company news, ranked lower");
        }
        boolean opinion = OPINION.matcher(r.url()).find() || OPINION.matcher(title).find();
        if (opinion) {
            score -= 1.5;
            why.add("Opinion or review, ranked lower");
        }
        boolean placed = !countries.isEmpty();
        if (!placed) {
            score -= 1.0;
        }
        String country = countries.isEmpty() ? "" : countries.iterator().next();
        if (northKoreaSecurity) {
            country = "KR";
            why.add("Korean Peninsula security");
        }
        boolean foreign = !northKoreaSecurity && foreignSubject(r);
        if (foreign) {
            score -= 0.5;
            why.add("About a country we do not cover, ranked lower");
        }
        return new Scored(r, score, List.copyOf(why), publisher, country, placed && !routine && !foreign && !opinion);
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

    /**
     * Best first, but balanced: at every point from the top, no country holds more than
     * {@link #COUNTRY_SHARE} of the stories so far and no publisher more than
     * {@link #PUBLISHER_SHARE} (rounded up), and no publisher appears
     * three times in a row while others wait. When only one country or publisher is left, it
     * follows. Nothing is dropped: the order changes, every story stays.
     */
    static List<Scored> balance(List<Scored> bestFirst) {
        List<Scored> waiting = new ArrayList<>(bestFirst);
        List<Scored> out = new ArrayList<>();
        Map<String, Integer> byCountry = new HashMap<>();
        Map<String, Integer> byPublisher = new HashMap<>();
        while (!waiting.isEmpty()) {
            int n = out.size() + 1;
            int countryCap = Math.max(1, (int) Math.ceil(n * COUNTRY_SHARE));
            int publisherCap = Math.max(1, (int) Math.ceil(n * PUBLISHER_SHARE));
            Scored next = waiting.stream()
                    .filter(s -> s.country().isEmpty() || byCountry.getOrDefault(s.country(), 0) < countryCap)
                    .filter(s -> byPublisher.getOrDefault(s.publisher(), 0) < publisherCap)
                    .filter(s -> !thirdInARow(out, s.publisher()))
                    .findFirst()
                    .orElseGet(() -> waiting.stream().filter(s -> !thirdInARow(out, s.publisher())).findFirst()
                            .orElse(waiting.getFirst()));
            waiting.remove(next);
            out.add(next);
            byCountry.merge(next.country(), 1, Integer::sum);
            byPublisher.merge(next.publisher(), 1, Integer::sum);
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
