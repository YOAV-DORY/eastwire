package io.github.yoavdory.eastwire.ingest.gdelt;

import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * GDELT publishes one GKG file per 15-minute slot, named by the slot's UTC time
 * ({@code 20261013111500.gkg.csv.zip}). The cursor is the last slot fully processed.
 */
final class GkgSlots {

    static final Duration SLOT = Duration.ofMinutes(15);
    private static final Pattern GKG_LINE = Pattern.compile("/(\\d{14})\\.gkg\\.csv\\.zip\\s*$", Pattern.MULTILINE);

    private GkgSlots() {
    }

    /** The newest GKG slot announced in {@code lastupdate.txt}. */
    static Optional<Instant> latestFromLastUpdate(String body) {
        Matcher m = GKG_LINE.matcher(body);
        return m.find() ? Optional.of(GkgParser.parseTime(m.group(1))) : Optional.empty();
    }

    static String format(Instant slot) {
        return GkgParser.GDELT_TIME.format(slot.atOffset(ZoneOffset.UTC));
    }

    /**
     * Slots to process, oldest first: everything after the cursor up to {@code latest}, but never
     * further back than {@code maxLookback}. Without a cursor (first run) only {@code bootstrap}
     * worth of slots is taken. Slots skipped because of the lookback limit are a reported gap.
     */
    static Plan plan(String cursor, Instant latest, Duration maxLookback, Duration bootstrap) {
        Instant earliestAllowed = latest.minus(maxLookback).plus(SLOT);
        Instant start;
        int skipped = 0;
        if (cursor == null) {
            start = latest.minus(bootstrap).plus(SLOT);
        } else {
            Instant next = GkgParser.parseTime(cursor).plus(SLOT);
            if (next.isBefore(earliestAllowed)) {
                skipped = (int) (Duration.between(next, earliestAllowed).toMinutes() / SLOT.toMinutes());
                start = earliestAllowed;
            } else {
                start = next;
            }
        }
        List<Instant> slots = new ArrayList<>();
        for (Instant s = start; !s.isAfter(latest); s = s.plus(SLOT)) {
            slots.add(s);
        }
        return new Plan(slots, skipped);
    }

    record Plan(List<Instant> slots, int skippedBeyondLookback) {
    }
}
