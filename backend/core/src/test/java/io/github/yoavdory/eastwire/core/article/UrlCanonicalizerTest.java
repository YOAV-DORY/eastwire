package io.github.yoavdory.eastwire.core.article;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

class UrlCanonicalizerTest {

    @Test
    void removesTrackingParametersAndFragmentButKeepsAWorkingLink() {
        assertThat(UrlCanonicalizer.canonicalUrl(
                "https://WWW.Example.com/news/story?id=7&utm_source=x&fbclid=abc&utm_medium=y#comments"))
                .isEqualTo("https://www.example.com/news/story?id=7");
    }

    @Test
    void keepsNonDefaultPortsAndAddsARootPath() {
        assertThat(UrlCanonicalizer.canonicalUrl("http://example.com:8080")).isEqualTo("http://example.com:8080/");
        assertThat(UrlCanonicalizer.canonicalUrl("https://example.com:443/a")).isEqualTo("https://example.com/a");
    }

    @ParameterizedTest
    @ValueSource(strings = {
            "https://www.example.com/news/story",
            "http://example.com/news/story/",
            "https://m.example.com/news/story",
            "https://amp.example.com/news/story",
            "https://www.example.com/news/story/amp/",
            "https://example.com/news/story?utm_campaign=z#top"})
    void variantsOfTheSameArticleShareOneHash(String variant) {
        assertThat(UrlCanonicalizer.hash(variant))
                .hasSize(32)
                .isEqualTo(UrlCanonicalizer.hash("https://example.com/news/story"));
    }

    @Test
    void differentArticlesGetDifferentHashes() {
        assertThat(UrlCanonicalizer.hash("https://example.com/a?id=1"))
                .isNotEqualTo(UrlCanonicalizer.hash("https://example.com/a?id=2"));
    }

    @Test
    void domainDropsOnlyWww() {
        assertThat(UrlCanonicalizer.domain("https://www.Asahi.com/ajw/x")).isEqualTo("asahi.com");
        assertThat(UrlCanonicalizer.domain("https://english.kyodonews.net/x")).isEqualTo("english.kyodonews.net");
    }

    @ParameterizedTest
    @ValueSource(strings = {"ftp://example.com/x", "javascript:alert(1)", "not a url", "https:///nohost"})
    void rejectsNonWebUrls(String url) {
        assertThatThrownBy(() -> UrlCanonicalizer.canonicalUrl(url)).isInstanceOf(IllegalArgumentException.class);
    }
}
