package io.github.yoavdory.eastwire.ingest.globalvoices;

import com.rometools.rome.feed.synd.SyndCategory;
import com.rometools.rome.feed.synd.SyndContent;
import com.rometools.rome.feed.synd.SyndEntry;
import io.github.yoavdory.eastwire.core.article.Location;
import io.github.yoavdory.eastwire.core.article.Location.Confidence;
import io.github.yoavdory.eastwire.core.article.Location.Method;
import io.github.yoavdory.eastwire.core.article.Location.Precision;
import io.github.yoavdory.eastwire.core.article.Location.Role;
import io.github.yoavdory.eastwire.core.config.ComplianceConfig;
import io.github.yoavdory.eastwire.core.config.Country;
import io.github.yoavdory.eastwire.core.geo.DatelineDetector;
import io.github.yoavdory.eastwire.core.geo.Gazetteer;
import io.github.yoavdory.eastwire.core.geo.PrimaryPlaces;
import io.github.yoavdory.eastwire.core.sector.SectorSignals;
import io.github.yoavdory.eastwire.ingest.pipeline.ArticleCandidate;
import io.github.yoavdory.eastwire.ingest.pipeline.Text;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.TreeSet;
import java.util.stream.Collectors;

/**
 * Maps one Global Voices feed item to a candidate.
 *
 * <ul>
 *   <li>Country: only from Global Voices' own category tags (e.g. "South Korea"). Items with
 *       no covered country are skipped; this is how topic feeds are filtered.</li>
 *   <li>Cities: names found in the headline and summary (gazetteer), role MENTIONED. A national
 *       capital gets LOW confidence: "Beijing", "Seoul" or "New Delhi" usually means the
 *       government, not the city.</li>
 *   <li>Event location: only from a dateline at the start of the summary.</li>
 *   <li>Publisher location: none. Global Voices is an international network.</li>
 *   <li>Sector hints: all of the item's Global Voices tags; config/sectors.yaml decides which count.</li>
 *   <li>Main subject: {@code PrimaryPlaces} (headline, dateline, or the only country it is filed under).</li>
 * </ul>
 */
final class GlobalVoicesMapper {

    private final Map<String, Country> countriesByName;
    private final Gazetteer gazetteer;
    private final DatelineDetector datelines;

    GlobalVoicesMapper(ComplianceConfig config, Gazetteer gazetteer) {
        this.countriesByName = config.activeCountries().stream().collect(Collectors.toMap(Country::name, c -> c));
        this.gazetteer = gazetteer;
        this.datelines = new DatelineDetector(gazetteer);
    }

    Optional<ArticleCandidate> map(String sourceSlug, SyndEntry entry, Instant now) {
        Set<String> categories = entry.getCategories().stream()
                .map(SyndCategory::getName)
                .filter(n -> n != null && !n.isBlank())
                .map(String::strip)
                .collect(Collectors.toCollection(TreeSet::new));
        List<Country> countries = categories.stream()
                .map(countriesByName::get)
                .filter(c -> c != null)
                .distinct()
                .toList();
        if (countries.isEmpty() || entry.getLink() == null) {
            return Optional.empty();
        }

        String title = Text.title(entry.getTitle());
        String summary = entry.getDescription() == null ? null : Text.plain(entry.getDescription().getValue());
        String content = entry.getContents().stream().map(SyndContent::getValue).filter(v -> v != null).findFirst().orElse(null);

        List<Location> locations = new ArrayList<>();
        for (Country c : countries) {
            locations.add(new Location(null, c.iso2(), Role.MENTIONED, Precision.COUNTRY, Confidence.HIGH,
                    Method.FEED_CATEGORY, "Filed under " + c.name() + " by Global Voices"));
        }
        String searchable = (title == null ? "" : title) + " \n " + (summary == null ? "" : summary);
        for (Gazetteer.Match m : gazetteer.find(searchable)) {
            locations.add(new Location(m.city().geonamesId(), m.city().countryIso2(), Role.MENTIONED, Precision.CITY,
                    m.weak() || m.city().isNationalCapital() ? Confidence.LOW : Confidence.MEDIUM,
                    Method.GAZETTEER, "Mentions " + m.matchedText()));
        }
        datelines.detect(summary).ifPresent(city -> locations.add(new Location(city.geonamesId(), city.countryIso2(),
                Role.EVENT, Precision.CITY, Confidence.HIGH, Method.DATELINE, "Dateline: " + city.name())));

        List<Location> marked = PrimaryPlaces.mark(title, locations, gazetteer, false);
        String author = entry.getAuthor() == null || entry.getAuthor().isBlank() ? null : entry.getAuthor().strip();
        return Optional.of(new ArticleCandidate(sourceSlug, entry.getLink().strip(), title, summary, author, null,
                PartnerReprints.isPartnerReprint(content), ArticleCandidate.ExcerptKind.CC_BY_EXCERPT,
                toInstant(entry.getPublishedDate()), now, "en", marked, SectorSignals.categories(categories)));
    }

    private static Instant toInstant(Date date) {
        return date == null ? null : date.toInstant();
    }
}
