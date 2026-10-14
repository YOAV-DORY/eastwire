package io.github.yoavdory.eastwire.core.sector;

import java.util.List;
import java.util.Locale;

/**
 * A sector an article was tagged with, and every rule that contributed, so the reader can see why.
 *
 * @param score sum of the rule weights (theme weights capped), rounded to two decimals
 */
public record SectorMatch(String sector, double score, List<MatchedRule> rules) {

    public SectorMatch {
        rules = List.copyOf(rules);
    }

    /**
     * @param kind   what kind of evidence this is
     * @param value  the keyword as written in the rules, the GDELT theme code, or the feed category
     * @param field  "headline" or "excerpt" for keywords, null otherwise
     * @param weight what it added to the score (negative for negative phrases)
     */
    public record MatchedRule(Kind kind, String value, String field, double weight) {
    }

    public enum Kind {
        KEYWORD, NEGATIVE, GDELT_THEME, FEED_CATEGORY;

        public String json() {
            return name().toLowerCase(Locale.ROOT);
        }
    }
}
