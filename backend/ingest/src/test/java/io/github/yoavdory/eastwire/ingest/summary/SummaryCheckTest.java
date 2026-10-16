package io.github.yoavdory.eastwire.ingest.summary;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

/** Invented headlines and descriptions; only the checks are under test. */
class SummaryCheckTest {

    private static final String HEADLINE = "Port city opens new ferry route to Busan";
    private static final String TEXT = "The city of Fukuoka will start a daily ferry service to Busan in March, cutting the "
            + "journey to three hours, officials said on Tuesday. The route replaces one suspended in 2020.";

    @Test
    void acceptsANeutralSentenceInItsOwnWordsWithOnlyStatedFacts() {
        assertThat(SummaryCheck.accept("Fukuoka plans a daily three-hour ferry link with Busan from March, replacing a route "
                + "suspended in 2020.", HEADLINE, TEXT))
                .hasValue("Fukuoka plans a daily three-hour ferry link with Busan from March, replacing a route suspended in 2020.");
    }

    @Test
    void rejectsCopyingFiveWordsInARow() {
        assertThat(SummaryCheck.accept("Officials said Fukuoka will start a daily ferry service to Busan in March.", HEADLINE, TEXT))
                .isEmpty();
    }

    @Test
    void rejectsNumbersAndNamesTheSourceDidNotState() {
        assertThat(SummaryCheck.accept("Fukuoka plans a daily ferry link with Busan from March, costing 40 million yen.",
                HEADLINE, TEXT)).isEmpty();
        assertThat(SummaryCheck.accept("Fukuoka and Osaka plan a daily ferry link with Busan from March onwards.",
                HEADLINE, TEXT)).isEmpty();
    }

    @Test
    void rejectsRefusalsChatterAndHeadlineRepeats() {
        assertThat(SummaryCheck.accept("NONE", HEADLINE, TEXT)).isEmpty();
        assertThat(SummaryCheck.accept("This article says Fukuoka plans a ferry link with Busan in March.", HEADLINE, TEXT)).isEmpty();
        assertThat(SummaryCheck.accept("Port city opens a new ferry route to Busan, the city said.", HEADLINE, TEXT)).isEmpty();
        assertThat(SummaryCheck.accept("Too short.", HEADLINE, TEXT)).isEmpty();
    }

    @Test
    void rejectsJudgmentsThePublisherDidNotMake() {
        assertThat(SummaryCheck.accept("Fukuoka's daily Busan ferry from March is a historic link revived after 2020.",
                HEADLINE, TEXT)).isEmpty();
    }

    @Test
    void rejectsANegationThatFlipsTheStory() {
        // From a real run: the headline says the opposite.
        assertThat(SummaryCheck.accept("China's focus on education for only daughters led to obstacles in marriage, not evidence "
                        + "of modernization success.", "China’s fertility crisis is evidence of its modernization success",
                "China’s only daughters were raised to pursue education, independence and opportunity. Now, those same qualities "
                        + "are increasingly seen as obstacles to marriage and motherhood.")).isEmpty();
    }

    @Test
    void namesMayChangeFormLikeChinaToChinese() {
        assertThat(SummaryCheck.namesFrom("Chinese regulators asked platforms to remove the posts.", "China orders posts removed"))
                .isTrue();
    }
}
