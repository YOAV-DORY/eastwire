package io.github.yoavdory.eastwire.core.config;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.net.URI;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.regex.Pattern;
import tools.jackson.databind.DeserializationFeature;
import tools.jackson.databind.PropertyNamingStrategies;
import tools.jackson.dataformat.yaml.YAMLMapper;

/**
 * The illustrative images of {@code config/images.yaml}: Wikimedia Commons files whose own file
 * pages were read and whose rights were recorded. An entry is served only if every rights field
 * is present and its license is one that allows reuse with credit; anything uncertain is
 * rejected here, at load time, and never reaches a page.
 *
 * <p>An image illustrates a place or a topic. It is never a photo of the reported event, and
 * every page that shows one labels it "Illustrative image" with its credit and license.
 */
public final class ImageCatalog {

    /** Licenses that allow reuse on a non-commercial news site with credit. Nothing else is accepted. */
    static final Pattern ACCEPTED_LICENSE = Pattern.compile("CC0|Public domain|CC BY(-SA)? [234]\\.\\d");
    static final Set<String> IMAGE_HOSTS = Set.of("thumb.wikimedia.org", "upload.wikimedia.org");
    static final Set<Integer> WIDTHS = Set.of(500, 960, 1920);

    private static final YAMLMapper YAML = YAMLMapper.builder()
            .propertyNamingStrategy(PropertyNamingStrategies.SNAKE_CASE)
            .disable(DeserializationFeature.FAIL_ON_NULL_FOR_PRIMITIVES)
            .build();

    private final List<Image> images;
    private final List<Rejected> rejected;

    ImageCatalog(Collection<Image> entries) {
        List<Image> ok = new ArrayList<>();
        List<Rejected> no = new ArrayList<>();
        for (Image image : entries) {
            Optional<String> problem = problem(image);
            if (problem.isPresent()) {
                no.add(new Rejected(image.id(), problem.get()));
            } else {
                ok.add(image);
            }
        }
        this.images = List.copyOf(ok);
        this.rejected = List.copyOf(no);
    }

    public static ImageCatalog load(Path configDir) {
        Path file = configDir.resolve("images.yaml");
        if (!Files.exists(file)) {
            return new ImageCatalog(List.of());
        }
        try (InputStream in = Files.newInputStream(file)) {
            ImagesFile parsed = YAML.readValue(in, ImagesFile.class);
            return new ImageCatalog(parsed.images() == null ? List.of() : parsed.images());
        } catch (IOException e) {
            throw new UncheckedIOException("Cannot read " + file, e);
        }
    }

    public static ImageCatalog of(Collection<Image> entries) {
        return new ImageCatalog(entries);
    }

    public List<Image> images() {
        return images;
    }

    public List<Rejected> rejected() {
        return rejected;
    }

    /** Why an entry cannot be served, or empty if it is complete and its license is accepted. */
    static Optional<String> problem(Image i) {
        if (blank(i.id()) || blank(i.file())) {
            return Optional.of("id and file are required");
        }
        if (blank(i.license()) || !ACCEPTED_LICENSE.matcher(i.license()).matches()) {
            return Optional.of("license " + i.license() + " is not one EastWire accepts");
        }
        if (!i.license().startsWith("CC0") && !i.license().startsWith("Public domain") && blank(i.licenseUrl())) {
            return Optional.of("license_url is required");
        }
        if (blank(i.filePage()) || !i.filePage().startsWith("https://commons.wikimedia.org/wiki/File:")) {
            return Optional.of("file_page must be the file's Wikimedia Commons page");
        }
        if (blank(i.imageUrl()) || !i.imageUrl().contains("{width}") || !IMAGE_HOSTS.contains(host(i.imageUrl()))) {
            return Optional.of("image_url must be a Wikimedia thumbnail template with {width}");
        }
        if (blank(i.creator())) {
            return Optional.of("creator is required");
        }
        if (i.attributionRequired() && blank(i.attribution())) {
            return Optional.of("attribution is required by the license");
        }
        if (blank(i.alt()) || blank(i.caption())) {
            return Optional.of("alt text and caption are required");
        }
        if (blank(i.changes()) || blank(i.permittedUse())) {
            return Optional.of("changes and permitted_use must be recorded");
        }
        if (i.width() <= 0 || i.height() <= 0) {
            return Optional.of("original width and height are required");
        }
        boolean placed = i.cities() != null && !i.cities().isEmpty();
        boolean topical = i.country() != null && i.sectors() != null && !i.sectors().isEmpty();
        if (placed == topical) {
            return Optional.of("an image illustrates either cities or a country and sectors, not both or neither");
        }
        if (topical && (i.headlineWords() == null || i.headlineWords().isEmpty())) {
            return Optional.of("a topic image needs headline_words, so it only illustrates stories on its topic");
        }
        return Optional.empty();
    }

    private static boolean blank(String s) {
        return s == null || s.isBlank();
    }

    private static String host(String url) {
        try {
            return URI.create(url.replace("{width}", "500")).getHost();
        } catch (IllegalArgumentException e) {
            return null;
        }
    }

    /**
     * One cleared image.
     *
     * @param imageUrl thumbnail URL with a {@code {width}} placeholder (500, 960 or 1920)
     * @param cities   GeoNames ids of the cities it illustrates, or
     * @param country  with {@code sectors}: a topic it illustrates (e.g. Japan + geopolitics: the Diet)
     */
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Image(
            String id,
            String file,
            String filePage,
            String imageUrl,
            int width,
            int height,
            String creator,
            String license,
            String licenseUrl,
            String attribution,
            boolean attributionRequired,
            boolean shareAlike,
            String permittedUse,
            String changes,
            String alt,
            String caption,
            String position,
            List<Long> cities,
            String country,
            List<String> sectors,
            List<String> headlineWords,
            String note) {

        public String url(int width) {
            return imageUrl.replace("{width}", String.valueOf(width));
        }
    }

    public record Rejected(String id, String reason) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record ImagesFile(LocalDate checkedOn, List<Image> images) {
    }
}
