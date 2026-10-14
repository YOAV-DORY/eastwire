package io.github.yoavdory.eastwire.api.articles;

import java.util.List;

/** Read access to stored articles. */
public interface ArticleRepository {

    /** One page of articles, newest first, with their locations and sectors. */
    List<ArticleRow> find(ArticleQuery query);

    /** How many articles match the filters (all pages). */
    long count(ArticleQuery query);
}
