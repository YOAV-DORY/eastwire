package io.github.yoavdory.eastwire.ingest.pipeline;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class TextTest {

    @Test
    void decodesEntitiesAndDropsTagsInTitles() {
        assertThat(Text.title("Plans for a microwave-only caf&#xE9; on <b>Argyle</b> Street"))
                .isEqualTo("Plans for a microwave-only café on Argyle Street");
        assertThat(Text.title("Tom &amp; Jerry &lt;script&gt;alert(1)&lt;/script&gt;"))
                .isEqualTo("Tom & Jerry");
    }

    @Test
    void capsVeryLongTitles() {
        assertThat(Text.title("word ".repeat(200))).hasSizeLessThanOrEqualTo(Text.MAX_TITLE_CHARS).endsWith("…");
    }

    @Test
    void plainTextCollapsesWhitespaceAndReturnsNullForNothing() {
        assertThat(Text.plain("<p>One</p>\n\n<p>  Two </p>")).isEqualTo("One Two");
        assertThat(Text.plain("<p> </p>")).isNull();
        assertThat(Text.plain(null)).isNull();
    }
}
