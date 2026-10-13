package io.github.yoavdory.eastwire.core.config;

/** The most a source's terms allow EastWire to show. */
public enum DisplayMode {
    /** Headline, a short permitted excerpt, and a link. */
    HEADLINE_EXCERPT,
    /** Headline as link text and a link; no excerpt. */
    HEADLINE_ONLY,
    /** Only the platform's official embed. */
    EMBED,
    /** Nothing may be shown. */
    NONE
}
