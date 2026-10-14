package io.github.yoavdory.eastwire.core.policy;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class ExcerptsTest {

    @Test
    void returnsNullWhenNothingMayBeShown() {
        assertThat(Excerpts.truncate("Some text.", 0)).isNull();
        assertThat(Excerpts.truncate(null, 100)).isNull();
        assertThat(Excerpts.truncate("   ", 100)).isNull();
    }

    @Test
    void keepsShortTextAndNormalizesWhitespace() {
        assertThat(Excerpts.truncate("  A short\n dek.  ", 100)).isEqualTo("A short dek.");
    }

    @Test
    void cutsAtTheLastWholeSentenceThatFits() {
        String text = "First sentence is here. Second sentence is a little longer. Third one.";
        assertThat(Excerpts.truncate(text, 40)).isEqualTo("First sentence is here.");
    }

    @Test
    void fallsBackToWholeWordsWithAnEllipsis() {
        String text = "One very long sentence without any full stop that keeps going and going";
        String result = Excerpts.truncate(text, 30);
        assertThat(result).hasSizeLessThanOrEqualTo(30).endsWith("…");
        assertThat(result).isEqualTo("One very long sentence…");
    }
}
