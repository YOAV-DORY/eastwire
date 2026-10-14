package io.github.yoavdory.eastwire.api.articles;

import java.time.Instant;

/**
 * Filters for the article feed and search, already validated.
 *
 * @param country ISO code of a covered country, or null for all
 * @param cityId  GeoNames id of a city on the city list, or null
 * @param from    inclusive lower bound on the article time, or null
 * @param to      exclusive upper bound, or null
 * @param page    1-based page number
 * @param text    full-text search query (Postgres websearch syntax), or null for the plain feed
 * @param sector  sector slug (economy, technology...), or null for all
 */
public record ArticleQuery(String country, Long cityId, Instant from, Instant to, int page, int size, String text, Sort sort,
        String sector) {

    public static final int MAX_PAGE = 20;
    public static final int MAX_SIZE = 50;
    public static final int DEFAULT_SIZE = 20;

    public enum Sort {
        /** Newest first. */
        DATE,
        /** Best text match first (only with a search query), then newest. */
        RELEVANCE
    }

    /** A feed query (no search text), newest first. */
    public ArticleQuery(String country, Long cityId, Instant from, Instant to, int page, int size) {
        this(country, cityId, from, to, page, size, null, Sort.DATE, null);
    }

    public ArticleQuery(String country, Long cityId, Instant from, Instant to, int page, int size, String text, Sort sort) {
        this(country, cityId, from, to, page, size, text, sort, null);
    }

    public int offset() {
        return (page - 1) * size;
    }
}
