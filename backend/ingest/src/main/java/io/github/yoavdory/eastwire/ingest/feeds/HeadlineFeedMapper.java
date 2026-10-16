package io.github.yoavdory.eastwire.ingest.feeds;

import com.rometools.rome.feed.synd.SyndCategory;
import com.rometools.rome.feed.synd.SyndEntry;
import io.github.yoavdory.eastwire.core.article.Location;
import io.github.yoavdory.eastwire.core.article.Location.Confidence;
import io.github.yoavdory.eastwire.core.article.Location.Method;
import io.github.yoavdory.eastwire.core.article.Location.Precision;
import io.github.yoavdory.eastwire.core.article.Location.Role;
import io.github.yoavdory.eastwire.core.config.ComplianceConfig;
import io.github.yoavdory.eastwire.core.config.Country;
import io.github.yoavdory.eastwire.core.config.SourceConfig;
import io.github.yoavdory.eastwire.core.geo.DatelineDetector;
import io.github.yoavdory.eastwire.core.geo.Gazetteer;
import io.github.yoavdory.eastwire.core.geo.PrimaryPlaces;
import io.github.yoavdory.eastwire.core.sector.SectorSignals;
import io.github.yoavdory.eastwire.ingest.pipeline.ArticleCandidate;
import io.github.yoavdory.eastwire.ingest.pipeline.Text;
import java.net.URI;
import java.net.URISyntaxException;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.TreeSet;
import java.util.stream.Collectors;

/**
 * Maps one item of a publisher's headline feed to a candidate.
 *
 * <ul>
 *   <li>Stored: headline, link, publication time. Never the feed's own summary: these sources
 *       allow headline links only. For sources marked {@code summaries: true} the summary is
 *       passed on so EastWire can write its own one-line summary from it (docs/summaries.md).</li>
 *   <li>Places: a country the source covers as a whole ({@code covers_country}, e.g. Sixth Tone
 *       covers China), countries and cities the headline names, and the dateline at the start
 *       of the summary ("TOKYO (Kyodo) --"). The summary is read for that and then dropped.</li>
 *   <li>An item with no main-subject place in a covered country is skipped: Mainichi's feed
 *       also carries world wire copy (e.g. US baseball) that is not about our countries.</li>
 *   <li>Publisher location from the source registry, never a main subject.</li>
 *   <li>Feature or news: the source's {@code story_type} or its {@code feature_categories};
 *       items in its {@code skip_categories} are not stored at all.</li>
 *   <li>An item without a readable publication date is skipped, never dated "now".</li>
 * </ul>
 */
final class HeadlineFeedMapper {

    private final List<Country> countries;
    private final Map<String, Country> byIso;
    private final Gazetteer gazetteer;
    private final DatelineDetector datelines;

    HeadlineFeedMapper(ComplianceConfig config, Gazetteer gazetteer) {
        this.countries = config.activeCountries();
        this.byIso = countries.stream().collect(Collectors.toMap(Country::iso2, c -> c));
        this.gazetteer = gazetteer;
        this.datelines = new DatelineDetector(gazetteer);
    }

    Optional<ArticleCandidate> map(SourceConfig source, SyndEntry entry, Instant now) {
        String title = Text.title(entry.getTitle());
        String link = link(entry.getLink());
        if (title == null || title.isBlank() || link == null) {
            return Optional.empty();
        }
        String summary = entry.getDescription() == null ? "" : Objects.requireNonNullElse(Text.plain(entry.getDescription().getValue()), "");
        Set<String> categories = entry.getCategories().stream()
                .map(SyndCategory::getName)
                .filter(n -> n != null && !n.isBlank())
                .map(String::strip)
                .collect(Collectors.toCollection(TreeSet::new));
        if (source.isSkipped(categories)) {
            // e.g. Korea.net's "Honorary Reporters" (readers' posts) and photo galleries: not news.
            return Optional.empty();
        }

        List<Location> locations = new ArrayList<>();
        Country covered = source.coversCountry() == null ? null : byIso.get(source.coversCountry());
        if (covered != null) {
            locations.add(new Location(null, covered.iso2(), Role.MENTIONED, Precision.COUNTRY, Confidence.HIGH,
                    Method.FEED_CATEGORY, "Covered by " + source.publisher() + ", a " + covered.name() + " publication"));
        }
        for (Country c : countries) {
            if (c != covered && gazetteer.mentionsCountry(c.iso2(), title)) {
                locations.add(new Location(null, c.iso2(), Role.MENTIONED, Precision.COUNTRY, Confidence.MEDIUM,
                        Method.GAZETTEER, "Headline names " + c.name()));
            }
        }
        for (Gazetteer.Match m : gazetteer.find(title + " \n " + summary)) {
            locations.add(new Location(m.city().geonamesId(), m.city().countryIso2(), Role.MENTIONED, Precision.CITY,
                    m.weak() || m.city().isNationalCapital() ? Confidence.LOW : Confidence.MEDIUM,
                    Method.GAZETTEER, "Mentions " + m.matchedText()));
        }
        datelines.detect(summary).ifPresent(city -> locations.add(new Location(city.geonamesId(), city.countryIso2(),
                Role.EVENT, Precision.CITY, Confidence.HIGH, Method.DATELINE, "Dateline: " + city.name())));
        if (source.publisherCountry() != null) {
            locations.add(new Location(source.publisherCityGeonamesId(), source.publisherCountry(), Role.PUBLISHER,
                    source.publisherCityGeonamesId() == null ? Precision.COUNTRY : Precision.CITY, Confidence.HIGH,
                    Method.SOURCE_REGISTRY, "Publisher: " + source.publisher()));
        }

        List<Location> marked = PrimaryPlaces.mark(title, locations, gazetteer, false);
        if (marked.stream().noneMatch(l -> l.primary() && l.role() != Role.PUBLISHER)) {
            return Optional.empty();
        }
        ArticleCandidate.StoryType type = source.isFeature(categories)
                ? ArticleCandidate.StoryType.FEATURE : ArticleCandidate.StoryType.NEWS;
        Instant published = publishedAt(source, entry);
        if (published == null) {
            // A feed item's discovery time is just when we first read the feed: storing it as the
            // story's time would make a week-old item look new. Without a date it is not stored.
            return Optional.empty();
        }
        if (source.datesAreDaysOnly()) {
            // Only the day is known: keep items from today and yesterday (Seoul time), with no
            // publication time, so cards say "found 2 h ago" instead of inventing an hour.
            java.time.ZoneId zone = source.feedZone() == null ? java.time.ZoneOffset.UTC : source.feedZone();
            java.time.LocalDate day = published.atZone(zone).toLocalDate();
            if (day.isBefore(now.atZone(zone).toLocalDate().minusDays(1))) {
                return Optional.empty();
            }
            published = null;
        }
        // The feed's description is kept on the candidate only for sources whose terms let us write
        // our own summary from it; it is never stored or shown as an excerpt (headline_only).
        String summarySource = source.summaries() && !summary.isBlank() ? summary : null;
        return Optional.of(new ArticleCandidate(source.slug(), link, title, summarySource, null, null, false,
                ArticleCandidate.ExcerptKind.NONE, published, now, "en", marked, SectorSignals.categories(categories), type));
    }

    /**
     * The item's publication time. Rome reads dates without a zone ("2026-10-15 16:44:03") in the
     * JVM's own zone; for a source whose feed is written in another zone ({@code feed_timezone}),
     * the same wall-clock time is re-read in that zone.
     */
    static Instant publishedAt(SourceConfig source, SyndEntry entry) {
        java.util.Date date = entry.getPublishedDate() != null ? entry.getPublishedDate() : entry.getUpdatedDate();
        if (date == null) {
            return null;
        }
        Instant parsed = date.toInstant();
        if (source.feedZone() == null) {
            return parsed;
        }
        return java.time.LocalDateTime.ofInstant(parsed, java.time.ZoneId.systemDefault()).atZone(source.feedZone()).toInstant();
    }

    /**
     * A usable URL from a feed link. Some feeds (Sixth Tone) put raw spaces and curly quotes in
     * the path; those are percent-encoded so the link stays the same page. Anything that is not
     * an absolute http(s) URL is dropped.
     */
    static String link(String raw) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        String s = raw.strip();
        try {
            URI uri = URI.create(s);
            return isWeb(uri) ? uri.toString() : null;
        } catch (IllegalArgumentException notEncoded) {
            int scheme = s.indexOf("://");
            if (scheme < 0) {
                return null;
            }
            int pathStart = s.indexOf('/', scheme + 3);
            String authority = pathStart < 0 ? s.substring(scheme + 3) : s.substring(scheme + 3, pathStart);
            String rest = pathStart < 0 ? "/" : s.substring(pathStart);
            int q = rest.indexOf('?');
            String path = q < 0 ? rest : rest.substring(0, q);
            String query = q < 0 ? null : rest.substring(q + 1);
            try {
                URI uri = new URI(s.substring(0, scheme), authority, path, query, null);
                return isWeb(uri) ? uri.toASCIIString() : null;
            } catch (URISyntaxException e) {
                return null;
            }
        }
    }

    private static boolean isWeb(URI uri) {
        return uri.getHost() != null && ("https".equalsIgnoreCase(uri.getScheme()) || "http".equalsIgnoreCase(uri.getScheme()));
    }
}
