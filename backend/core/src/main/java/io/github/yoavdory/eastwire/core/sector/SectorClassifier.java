package io.github.yoavdory.eastwire.core.sector;

import io.github.yoavdory.eastwire.core.sector.SectorMatch.Kind;
import io.github.yoavdory.eastwire.core.sector.SectorMatch.MatchedRule;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Tags an article with up to {@code max_sectors} sectors using the rules in {@code sectors.yaml}.
 *
 * <p>The input is only what EastWire may show (headline and permitted excerpt) plus the
 * source's own signals, so the reason for every tag can be shown next to the article.
 * Deterministic: the same input and rules always give the same tags.
 */
public final class SectorClassifier {

    private final SectorRules rules;
    private final List<Compiled> sectors;

    public SectorClassifier(SectorRules rules) {
        this.rules = rules;
        this.sectors = rules.sectors().stream().map(Compiled::new).toList();
    }

    public String version() {
        return rules.version();
    }

    public List<SectorMatch> classify(String headline, String excerpt, SectorSignals signals) {
        List<String> head = Term.words(headline);
        List<String> body = Term.words(excerpt);
        Set<String> categories = signals.feedCategories().stream().map(c -> c.strip().toLowerCase(Locale.ROOT))
                .collect(Collectors.toSet());

        List<SectorMatch> tagged = new ArrayList<>();
        for (Compiled s : sectors) {
            List<MatchedRule> matched = new ArrayList<>();
            double score = 0;
            for (Map.Entry<Term, Double> k : s.keywords.entrySet()) {
                if (k.getKey().matches(head)) {
                    matched.add(new MatchedRule(Kind.KEYWORD, k.getKey().text(), "headline", k.getValue()));
                    score += k.getValue();
                } else if (k.getKey().matches(body)) {
                    double w = k.getValue() * rules.excerptFactor();
                    matched.add(new MatchedRule(Kind.KEYWORD, k.getKey().text(), "excerpt", w));
                    score += w;
                }
            }
            for (Map.Entry<Term, Double> k : s.negative.entrySet()) {
                boolean inHead = k.getKey().matches(head);
                if (inHead || k.getKey().matches(body)) {
                    matched.add(new MatchedRule(Kind.NEGATIVE, k.getKey().text(), inHead ? "headline" : "excerpt", -k.getValue()));
                    score -= k.getValue();
                }
            }
            double themes = 0;
            for (Map.Entry<String, Double> t : s.themes.entrySet()) {
                Optional<String> hit = firstTheme(t.getKey(), signals.gdeltThemes());
                if (hit.isPresent()) {
                    matched.add(new MatchedRule(Kind.GDELT_THEME, hit.get(), null, t.getValue()));
                    themes += t.getValue();
                }
            }
            score += Math.min(themes, rules.themeCap());
            for (Map.Entry<String, Double> c : s.categories.entrySet()) {
                if (categories.contains(c.getKey().toLowerCase(Locale.ROOT))) {
                    matched.add(new MatchedRule(Kind.FEED_CATEGORY, c.getKey(), null, c.getValue()));
                    score += c.getValue();
                }
            }
            if (score >= rules.threshold()) {
                tagged.add(new SectorMatch(s.slug, Math.round(score * 100) / 100.0, matched));
            }
        }
        // Stable sort: equal scores keep the order of sectors.yaml.
        return tagged.stream()
                .sorted(Comparator.comparingDouble(SectorMatch::score).reversed())
                .limit(rules.maxSectors())
                .toList();
    }

    /** The first (alphabetical) theme code matching a rule; "NATURAL_DISASTER*" matches NATURAL_DISASTER_FLOODS. */
    private static Optional<String> firstTheme(String rule, Set<String> codes) {
        if (rule.endsWith("*")) {
            String stem = rule.substring(0, rule.length() - 1);
            return codes.stream().filter(c -> c.startsWith(stem)).findFirst();
        }
        return codes.contains(rule) ? Optional.of(rule) : Optional.empty();
    }

    private static final class Compiled {
        final String slug;
        final Map<Term, Double> keywords = new LinkedHashMap<>();
        final Map<Term, Double> negative = new LinkedHashMap<>();
        final Map<String, Double> themes;
        final Map<String, Double> categories;

        Compiled(SectorDefinition d) {
            slug = d.slug();
            d.keywords().forEach((k, w) -> keywords.put(Term.parse(k), w));
            d.negative().forEach((k, w) -> negative.put(Term.parse(k), w));
            themes = d.gdeltThemes();
            categories = d.feedCategories();
        }
    }
}
