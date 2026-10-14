package io.github.yoavdory.eastwire.api.articles;

import java.time.Instant;

/**
 * Filters for the article feed, already validated.
 *
 * @param country ISO code of a covered country, or null for all
 * @param cityId  GeoNames id of a city on the city list, or null
 * @param from    inclusive lower bound on the article time, or null
 * @param to      exclusive upper bound, or null
 * @param page    1-based page number
 */
public record ArticleQuery(String country, Long cityId, Instant from, Instant to, int page, int size) {

    public static final int MAX_PAGE = 20;
    public static final int MAX_SIZE = 50;
    public static final int DEFAULT_SIZE = 20;

    public int offset() {
        return (page - 1) * size;
    }
}
