package io.github.yoavdory.eastwire.ingest.gdelt;

import static io.github.yoavdory.eastwire.ingest.gdelt.GkgFixtures.INDIA;
import static io.github.yoavdory.eastwire.ingest.gdelt.GkgFixtures.NEW_DELHI;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Duration;
import java.time.Instant;
import org.junit.jupiter.api.Test;

class GkgParsingTest {

    @Test
    void parsesTheColumnsEastWireUses() {
        GkgRecord r = GkgParser.parse(GkgFixtures.row("20261013111500", "https://example.com/a",
                "Caf&#xE9; owners protest rent rises", NEW_DELHI + ";" + INDIA)).orElseThrow();
        assertThat(r.date()).isEqualTo(Instant.parse("2026-10-13T11:15:00Z"));
        assertThat(r.publishedAt()).isEqualTo(Instant.parse("2026-10-13T09:00:00Z"));
        assertThat(r.url()).isEqualTo("https://example.com/a");
        assertThat(r.title()).isEqualTo("Caf&#xE9; owners protest rent rises");
        assertThat(r.locations()).hasSize(2);
        assertThat(r.locations().getFirst().type()).isEqualTo(GkgRecord.Type.WORLD_CITY);
        assertThat(r.locations().getFirst().shortName()).isEqualTo("New Delhi");
        assertThat(r.locations().getFirst().fipsCountry()).isEqualTo("IN");
        assertThat(r.locations().getFirst().lat()).isEqualTo(28.6);
        assertThat(r.themes()).containsExactly("ECON_INFLATION", "TAX_FNCACT");
    }

    @Test
    void skipsNonWebDocumentsAndRejectsMalformedRows() {
        String broadcast = GkgFixtures.row("20261013111500", "https://example.com/a", "T", INDIA).replace("\t1\t", "\t2\t");
        assertThat(GkgParser.parse(broadcast)).isEmpty();
        assertThatThrownBy(() -> GkgParser.parse("only\tthree\tcolumns")).isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void ignoresBrokenLocationEntriesButKeepsTheRest() {
        assertThat(GkgParser.parseLocations("9#Nowhere#XX####;" + INDIA + ";garbage")).hasSize(1);
    }

    @Test
    void readsTheNewestGkgSlotFromLastUpdate() {
        assertThat(GkgSlots.latestFromLastUpdate(GkgFixtures.lastUpdate("20261013113000")))
                .contains(Instant.parse("2026-10-13T11:30:00Z"));
        assertThat(GkgSlots.latestFromLastUpdate("nothing here")).isEmpty();
    }

    @Test
    void plansSlotsAfterTheCursor() {
        Instant latest = Instant.parse("2026-10-13T11:30:00Z");
        GkgSlots.Plan plan = GkgSlots.plan("20261013104500", latest, Duration.ofHours(6), Duration.ofHours(1));
        assertThat(plan.slots()).extracting(GkgSlots::format)
                .containsExactly("20261013110000", "20261013111500", "20261013113000");
        assertThat(plan.skippedBeyondLookback()).isZero();
    }

    @Test
    void firstRunTakesOnlyTheBootstrapWindow() {
        Instant latest = Instant.parse("2026-10-13T11:30:00Z");
        assertThat(GkgSlots.plan(null, latest, Duration.ofHours(6), Duration.ofHours(1)).slots())
                .extracting(GkgSlots::format)
                .containsExactly("20261013104500", "20261013110000", "20261013111500", "20261013113000");
    }

    @Test
    void anOldCursorIsCappedAtTheLookbackAndTheSkippedSlotsAreCounted() {
        Instant latest = Instant.parse("2026-10-13T11:30:00Z");
        GkgSlots.Plan plan = GkgSlots.plan("20261012113000", latest, Duration.ofHours(6), Duration.ofHours(1));
        assertThat(plan.slots()).hasSize(24);
        assertThat(GkgSlots.format(plan.slots().getFirst())).isEqualTo("20261013054500");
        assertThat(plan.skippedBeyondLookback()).isEqualTo(96 - 24);
    }

    @Test
    void nothingToDoWhenTheCursorIsCurrent() {
        Instant latest = Instant.parse("2026-10-13T11:30:00Z");
        assertThat(GkgSlots.plan("20261013113000", latest, Duration.ofHours(6), Duration.ofHours(1)).slots()).isEmpty();
    }
}
