package io.github.yoavdory.eastwire.core.sector;

import static org.assertj.core.api.Assertions.assertThat;

import io.github.yoavdory.eastwire.core.config.ComplianceConfig;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.TreeSet;
import java.util.stream.Collectors;
import org.junit.jupiter.api.Assumptions;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.MappingIterator;
import tools.jackson.dataformat.csv.CsvMapper;
import tools.jackson.dataformat.csv.CsvSchema;

/**
 * Scores the real {@code config/sectors.yaml} against hand-labelled, invented headlines and
 * writes precision and recall to {@code build/sector-*.md}.
 *
 * <ul>
 *   <li>{@code sector-eval.csv}: the development set. Rules were adjusted after reading its misses.</li>
 *   <li>{@code sector-holdout.csv}: written after the rules were frozen and never tuned on.</li>
 * </ul>
 * Both were written by the person who wrote the rules, so even the holdout numbers are
 * optimistic. They guard against regressions; they do not measure accuracy on real news.
 */
class SectorEvaluationTest {

    private static SectorRules rules;
    private static SectorClassifier classifier;

    record Row(String headline, String excerpt, Set<String> expected, Set<String> themes, Set<String> categories) {
    }

    record Result(double precision, double recall) {
    }

    @BeforeAll
    static void load() {
        rules = SectorRules.load(Path.of(System.getProperty(ComplianceConfig.CONFIG_DIR_PROPERTY)));
        classifier = new SectorClassifier(rules);
    }

    @Test
    void developmentSet() throws IOException {
        Result r = evaluate(resource("sector-eval.csv"), "sector-eval", "Development set (rules tuned on it)");
        assertThat(r.precision()).as("micro precision; see build/sector-eval.md").isGreaterThanOrEqualTo(0.90);
        assertThat(r.recall()).as("micro recall; see build/sector-eval.md").isGreaterThanOrEqualTo(0.85);
    }

    @Test
    void holdoutSet() throws IOException {
        Result r = evaluate(resource("sector-holdout.csv"), "sector-holdout", "Holdout set (written after the rules were frozen)");
        assertThat(r.precision()).as("micro precision; see build/sector-holdout.md").isGreaterThanOrEqualTo(0.90);
        // Low on purpose: headline keywords miss much unseen wording (docs/sectors.md). Guards against regressions only.
        assertThat(r.recall()).as("micro recall; see build/sector-holdout.md").isGreaterThanOrEqualTo(0.30);
    }

    /** Real headlines (GDELT titles with their themes, Global Voices items with excerpt and tags), labelled by hand. */
    @Test
    void realSample() throws IOException {
        String file = System.getProperty("eastwire.sector-sample");
        Assumptions.assumeTrue(file != null, "run with -PsectorSample=<csv> to score a local sample of real headlines");
        try (InputStream in = Files.newInputStream(Path.of(file))) {
            evaluate(rows(in), "sector-real", "Real headlines, labelled by hand (not committed)");
        }
    }

    private static Result evaluate(List<Row> rows, String name, String title) throws IOException {
        Map<String, int[]> counts = new LinkedHashMap<>();   // sector -> {true pos, false pos, false neg}
        rules.sectors().forEach(s -> counts.put(s.slug(), new int[3]));
        int exact = 0;
        List<String> misses = new ArrayList<>();
        for (Row r : rows) {
            List<SectorMatch> matches = classifier.classify(r.headline(), r.excerpt(), new SectorSignals(r.themes(), r.categories()));
            Set<String> got = matches.stream().map(SectorMatch::sector).collect(Collectors.toCollection(TreeSet::new));
            if (got.equals(r.expected())) {
                exact++;
            } else {
                String why = matches.stream().filter(m -> !r.expected().contains(m.sector()))
                        .map(m -> m.sector() + " " + m.score() + " = " + m.rules().stream()
                                .map(x -> x.value() + (x.field() == null ? "" : " (" + x.field() + ")") + " " + x.weight())
                                .collect(Collectors.joining(", ")))
                        .collect(Collectors.joining("; "));
                misses.add("- \"" + r.headline() + "\": expected " + r.expected() + ", got " + got + (why.isEmpty() ? "" : ". Extra: " + why));
            }
            counts.forEach((sector, c) -> {
                boolean want = r.expected().contains(sector);
                boolean have = got.contains(sector);
                if (want && have) {
                    c[0]++;
                } else if (have) {
                    c[1]++;
                } else if (want) {
                    c[2]++;
                }
            });
        }
        int tp = counts.values().stream().mapToInt(c -> c[0]).sum();
        int fp = counts.values().stream().mapToInt(c -> c[1]).sum();
        int fn = counts.values().stream().mapToInt(c -> c[2]).sum();

        StringBuilder report = new StringBuilder()
                .append("# ").append(title).append("\n\n")
                .append(rows.size()).append(" headlines, rules version ").append(rules.version()).append(".\n\n")
                .append("| Sector | Precision | Recall | Labelled |\n|---|---|---|---|\n");
        counts.forEach((s, c) -> report.append(String.format(Locale.ROOT, "| %s | %s | %s | %d |%n",
                s, pct(c[0], c[0] + c[1]), pct(c[0], c[0] + c[2]), c[0] + c[2])));
        report.append(String.format(Locale.ROOT, "| **All (micro)** | **%s** | **%s** | %d |%n%n", pct(tp, tp + fp), pct(tp, tp + fn), tp + fn))
                .append(String.format(Locale.ROOT, "Exact tag set: %d of %d.%n%n", exact, rows.size()))
                .append("## Misses\n\n").append(String.join("\n", misses)).append('\n');
        Path out = Path.of("build", name + ".md");
        Files.createDirectories(out.getParent());
        Files.writeString(out, report);
        System.out.println(report);
        return new Result(ratio(tp, tp + fp), ratio(tp, tp + fn));
    }

    private static List<Row> resource(String file) throws IOException {
        try (InputStream in = SectorEvaluationTest.class.getResourceAsStream("/" + file)) {
            return rows(in);
        }
    }

    private static List<Row> rows(InputStream in) throws IOException {
        CsvMapper csv = CsvMapper.builder().build();
        try (MappingIterator<Map<String, String>> it = csv.readerFor(Map.class)
                .with(CsvSchema.emptySchema().withHeader()).readValues(in)) {
            return it.readAll().stream()
                    .map(m -> new Row(m.get("headline"), m.get("excerpt"), split(m.get("expected")), split(m.get("themes")),
                            split(m.get("categories"))))
                    .toList();
        }
    }

    private static Set<String> split(String cell) {
        if (cell == null || cell.isBlank()) {
            return new TreeSet<>();
        }
        return Arrays.stream(cell.split(";")).map(String::strip).collect(Collectors.toCollection(TreeSet::new));
    }

    private static double ratio(int a, int b) {
        return b == 0 ? 1.0 : (double) a / b;
    }

    private static String pct(int a, int b) {
        return b == 0 ? "n/a" : String.format(Locale.ROOT, "%.0f%%", 100.0 * a / b);
    }
}
