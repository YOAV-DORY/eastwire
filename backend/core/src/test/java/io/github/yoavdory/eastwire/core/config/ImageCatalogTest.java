package io.github.yoavdory.eastwire.core.config;

import static org.assertj.core.api.Assertions.assertThat;

import java.nio.file.Path;
import java.util.List;
import org.junit.jupiter.api.Test;

class ImageCatalogTest {

    private static ImageCatalog.Image image(String id, String license, String filePage, String imageUrl, String creator,
            String attribution, List<Long> cities, String country, List<String> sectors) {
        return new ImageCatalog.Image(id, "Invented.jpg", filePage, imageUrl, 4000, 3000, creator, license,
                "https://creativecommons.org/licenses/by-sa/4.0", attribution, true, license.contains("SA"),
                "Illustration beside news stories", "Resized; cropped by CSS", "An invented street", "Invented street",
                "50% 50%", cities, country, sectors, sectors == null ? null : List.of("parliament"), null);
    }

    private static final String PAGE = "https://commons.wikimedia.org/wiki/File:Invented.jpg";
    private static final String URL = "https://thumb.wikimedia.org/wikipedia/commons/thumb/0/00/Invented.jpg/{width}px-Invented.jpg";

    @Test
    void everyEntryInTheRepositoryIsComplete() {
        ImageCatalog catalog = ImageCatalog.load(Path.of(System.getProperty(ComplianceConfig.CONFIG_DIR_PROPERTY, "../config")));
        assertThat(catalog.rejected()).as("rejected entries in config/images.yaml").isEmpty();
        assertThat(catalog.images()).hasSizeGreaterThanOrEqualTo(15);
        assertThat(catalog.images()).extracting(ImageCatalog.Image::id).doesNotHaveDuplicates();
    }

    @Test
    void acceptsOnlyLicensesThatAllowReuseWithCredit() {
        ImageCatalog catalog = ImageCatalog.of(List.of(
                image("ok-by-sa", "CC BY-SA 4.0", PAGE, URL, "A. Photographer", "A. Photographer", List.of(1L), null, null),
                image("ok-cc0", "CC0", PAGE, URL, "A. Photographer", "A. Photographer", List.of(1L), null, null),
                image("nc", "CC BY-NC-SA 4.0", PAGE, URL, "A. Photographer", "A. Photographer", List.of(1L), null, null),
                image("nd", "CC BY-ND 4.0", PAGE, URL, "A. Photographer", "A. Photographer", List.of(1L), null, null),
                image("fair-use", "Fair use", PAGE, URL, "A. Photographer", "A. Photographer", List.of(1L), null, null)));
        assertThat(catalog.images()).extracting(ImageCatalog.Image::id).containsExactly("ok-by-sa", "ok-cc0");
        assertThat(catalog.rejected()).extracting(ImageCatalog.Rejected::id).containsExactly("nc", "nd", "fair-use");
    }

    @Test
    void rejectsUncertainProvenance() {
        ImageCatalog catalog = ImageCatalog.of(List.of(
                image("publisher-photo", "CC BY 4.0", "https://example.com/photo.jpg", URL, "A", "A", List.of(1L), null, null),
                image("hotlinked", "CC BY 4.0", PAGE, "https://example.com/{width}.jpg", "A", "A", List.of(1L), null, null),
                image("no-creator", "CC BY 4.0", PAGE, URL, "", "A", List.of(1L), null, null),
                image("no-credit", "CC BY 4.0", PAGE, URL, "A", " ", List.of(1L), null, null),
                image("no-subject", "CC BY 4.0", PAGE, URL, "A", "A", List.of(), null, null)));
        assertThat(catalog.images()).isEmpty();
        assertThat(catalog.rejected()).extracting(ImageCatalog.Rejected::reason).containsExactly(
                "file_page must be the file's Wikimedia Commons page",
                "image_url must be a Wikimedia thumbnail template with {width}",
                "creator is required",
                "attribution is required by the license",
                "an image illustrates either cities or a country and sectors, not both or neither");
    }
}
