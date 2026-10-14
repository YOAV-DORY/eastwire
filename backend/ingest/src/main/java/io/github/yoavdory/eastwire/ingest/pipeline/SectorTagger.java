package io.github.yoavdory.eastwire.ingest.pipeline;

import io.github.yoavdory.eastwire.core.sector.SectorClassifier;
import io.github.yoavdory.eastwire.core.sector.SectorMatch;
import io.github.yoavdory.eastwire.core.sector.SectorSignals;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionTemplate;
import tools.jackson.databind.json.JsonMapper;

/**
 * Writes an article's sectors, with the rules that matched, and records which version of
 * {@code config/sectors.yaml} produced them. Tags only from what readers can see (headline and
 * stored excerpt) plus the stored source signals, so the explanation shown always holds.
 */
@Component
public class SectorTagger {

    private static final int BATCH = 500;
    private static final JsonMapper JSON = JsonMapper.builder().build();

    private final JdbcClient jdbc;
    private final TransactionTemplate tx;
    private final SectorClassifier classifier;

    public SectorTagger(JdbcClient jdbc, TransactionTemplate tx, SectorClassifier classifier) {
        this.jdbc = jdbc;
        this.tx = tx;
        this.classifier = classifier;
    }

    /** Tags one article. Call inside the transaction that stores it. */
    public List<SectorMatch> tag(long articleId, String title, String excerpt, SectorSignals signals) {
        List<SectorMatch> matches = classifier.classify(title, excerpt, signals);
        jdbc.sql("DELETE FROM article_sector WHERE article_id = :id").param("id", articleId).update();
        for (SectorMatch m : matches) {
            jdbc.sql("""
                            INSERT INTO article_sector (article_id, sector, score, matched_rules)
                            VALUES (:id, :sector, :score, CAST(:rules AS jsonb))
                            """)
                    .param("id", articleId)
                    .param("sector", m.sector())
                    .param("score", m.score())
                    .param("rules", JSON.writeValueAsString(m.rules().stream().map(SectorTagger::ruleJson).toList()))
                    .update();
        }
        jdbc.sql("""
                        UPDATE article SET sector_signals = CAST(:signals AS jsonb), sector_rules_version = :version
                        WHERE id = :id
                        """)
                .param("signals", JSON.writeValueAsString(signals))
                .param("version", classifier.version())
                .param("id", articleId)
                .update();
        return matches;
    }

    /**
     * Re-tags every live article tagged with an older version of the rules (or never tagged).
     * Runs each hour, so editing sectors.yaml takes effect on stored articles at the next run.
     *
     * @return how many articles were re-tagged
     */
    public int retagStale() {
        record Stale(long id, String title, String excerpt, String signals) {
        }
        int total = 0;
        while (true) {
            List<Stale> batch = jdbc.sql("""
                            SELECT id, title, excerpt, sector_signals::text AS signals FROM article
                            WHERE sector_rules_version IS DISTINCT FROM :version AND expires_at > now()
                            ORDER BY id LIMIT :limit
                            """)
                    .param("version", classifier.version())
                    .param("limit", BATCH)
                    .query((rs, n) -> new Stale(rs.getLong("id"), rs.getString("title"), rs.getString("excerpt"),
                            rs.getString("signals")))
                    .list();
            if (batch.isEmpty()) {
                return total;
            }
            tx.executeWithoutResult(status -> batch.forEach(a -> tag(a.id(), a.title(), a.excerpt(), signals(a.signals()))));
            total += batch.size();
        }
    }

    static SectorSignals signals(String json) {
        if (json == null || json.isBlank() || json.equals("{}")) {
            return SectorSignals.NONE;
        }
        return JSON.readValue(json, SectorSignals.class);
    }

    private static Map<String, Object> ruleJson(SectorMatch.MatchedRule r) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("kind", r.kind().json());
        m.put("value", r.value());
        if (r.field() != null) {
            m.put("field", r.field());
        }
        m.put("weight", r.weight());
        return m;
    }
}
