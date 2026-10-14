package io.github.yoavdory.eastwire.ingest.globalvoices;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

class PartnerReprintsTest {

    @ParameterizedTest
    @ValueSource(strings = {
            "<p>Originally published on <a href='https://globalvoices.org/2026/01/01/x/'>Global Voices</a></p>",
            "<p>Plain body text with no notice.</p>",
            "<p>The minister republished nothing.</p>",
            ""})
    void ownPostsAreNotPartnerReprints(String html) {
        assertThat(PartnerReprints.isPartnerReprint(html)).isFalse();
    }

    @ParameterizedTest
    @ValueSource(strings = {
            "<p><em>This story was originally published by <a href='https://partner.example/a'>Partner</a>.</em></p>",
            "<p>This article was originally published on Partner Outlet and is republished here.</p>",
            "<p>Published as part of a content-sharing agreement with <a href='https://other.example'>Other</a>.</p>"})
    void noticesNamingAnotherOutletAreReprints(String html) {
        assertThat(PartnerReprints.isPartnerReprint(html)).isTrue();
    }
}
