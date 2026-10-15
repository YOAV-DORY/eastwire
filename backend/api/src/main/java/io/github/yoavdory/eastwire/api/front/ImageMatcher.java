package io.github.yoavdory.eastwire.api.front;

import io.github.yoavdory.eastwire.api.articles.ArticleRow;
import io.github.yoavdory.eastwire.core.config.ImageCatalog;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.Set;
import java.util.regex.Pattern;

/**
 * Picks an illustrative image for a story: one of its main-subject city when the headline or
 * dateline names that city, else one for its main-subject country and sector whose topic words
 * appear in the headline (e.g. Japan + geopolitics + "cabinet": the National Diet). Never an
 * image already used on the page, none for a story with no main-subject place, and none for a
 * story about a country we do not cover.
 */
final class ImageMatcher {

    private final ImageCatalog catalog;

    ImageMatcher(ImageCatalog catalog) {
        this.catalog = catalog;
    }

    Optional<ImageCatalog.Image> match(ArticleRow r, Set<String> used) {
        if (FrontRanker.foreignSubject(r)) {
            return Optional.empty();
        }
        String title = r.title().toLowerCase(Locale.ROOT);
        List<ArticleRow.LocationRow> main = r.locations().stream()
                .filter(l -> l.primary() && !"publisher".equals(l.role()))
                .toList();
        for (ArticleRow.LocationRow l : main) {
            // A city image only when the story is plainly about that city: named in the headline or its dateline.
            boolean named = l.placeName() != null && title.contains(l.placeName().toLowerCase(Locale.ROOT));
            if (l.placeId() == null || !(named || "dateline".equals(l.method()))) {
                continue;
            }
            Optional<ImageCatalog.Image> city = catalog.images().stream()
                    .filter(i -> !used.contains(i.id()) && i.cities() != null && i.cities().contains(l.placeId()))
                    .findFirst();
            if (city.isPresent()) {
                return city;
            }
        }
        for (ArticleRow.LocationRow l : main) {
            for (ArticleRow.SectorRow t : r.sectors()) {
                Optional<ImageCatalog.Image> topic = catalog.images().stream()
                        .filter(i -> !used.contains(i.id()) && l.countryIso2().equals(i.country())
                                && i.sectors() != null && i.sectors().contains(t.sector())
                                && headlineHasOneOf(title, i.headlineWords()))
                        .findFirst();
                if (topic.isPresent()) {
                    return topic;
                }
            }
        }
        return Optional.empty();
    }

    /** A topic image also needs the headline to be on its topic, e.g. "parliament" or "shares". */
    static boolean headlineHasOneOf(String lowerTitle, List<String> words) {
        if (words == null) {
            return false;
        }
        return words.stream().anyMatch(w -> Pattern.compile("(?<![\\p{L}])" + Pattern.quote(w.toLowerCase(Locale.ROOT))
                + "(?![\\p{L}])").matcher(lowerTitle).find());
    }

    static FrontPage.Image view(ImageCatalog.Image i) {
        String srcSet = i.url(500) + " 500w, " + i.url(960) + " 960w, " + i.url(1920) + " 1920w";
        return new FrontPage.Image(i.id(), i.url(960), srcSet, i.width(), i.height(), i.alt(), i.caption(),
                i.position() == null ? "50% 50%" : i.position(), i.creator(), i.attribution(), i.license(), i.licenseUrl(),
                i.filePage(), i.shareAlike(), i.changes(), true);
    }
}
