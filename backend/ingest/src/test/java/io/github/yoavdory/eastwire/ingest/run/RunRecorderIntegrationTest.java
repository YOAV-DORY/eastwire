package io.github.yoavdory.eastwire.ingest.run;

import static org.assertj.core.api.Assertions.assertThat;

import io.github.yoavdory.eastwire.ingest.PostgresTestBase;
import java.time.Instant;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

class RunRecorderIntegrationTest extends PostgresTestBase {

    private static final Instant T0 = Instant.parse("2026-10-13T12:00:00Z");

    @Autowired
    RunRecorder recorder;

    private short gdelt() {
        return recorder.sourceId("gdelt-gkg").orElseThrow();
    }

    private RunOutcome success(String cursor) {
        return new RunOutcome(RunOutcome.Status.SUCCESS, 10, 3, 200, null, null, cursor, T0.minusSeconds(60),
                Map.of("slotsProcessed", 2));
    }

    private void fail(short id, Instant at) {
        RunRecorder.SourceState before = recorder.state(id);
        long run = recorder.start(id, before.cursor(), at);
        recorder.finish(run, before, RunOutcome.failed(new IllegalStateException("boom"), 503), at);
    }

    @Test
    void aSuccessfulRunMovesTheCursorAndRecordsFreshness() {
        short id = gdelt();
        RunRecorder.SourceState before = recorder.state(id);
        long run = recorder.start(id, before.cursor(), T0);
        recorder.finish(run, before, success("20261013113000"), T0.plusSeconds(30));

        RunRecorder.SourceState after = recorder.state(id);
        assertThat(after.cursor()).isEqualTo("20261013113000");
        assertThat(after.consecutiveFailures()).isZero();
        assertThat(jdbc.sql("SELECT status FROM ingestion_run WHERE id = :id").param("id", run).query(String.class).single())
                .isEqualTo("success");
        assertThat(jdbc.sql("SELECT details->>'slotsProcessed' FROM ingestion_run").query(String.class).single()).isEqualTo("2");
        assertThat(count("SELECT count(*) FROM source_status WHERE last_success_at IS NOT NULL")).isEqualTo(1);
    }

    @Test
    void threeFailuresOpenTheCircuitAndASuccessClosesIt() {
        short id = gdelt();
        fail(id, T0);
        fail(id, T0.plusSeconds(3600));
        assertThat(recorder.state(id).circuitOpenUntil()).isNull();

        fail(id, T0.plusSeconds(7200));
        RunRecorder.SourceState open = recorder.state(id);
        assertThat(open.consecutiveFailures()).isEqualTo(3);
        assertThat(open.circuitOpenUntil()).isEqualTo(T0.plusSeconds(7200).plus(CircuitBreaker.OPEN_FOR));

        long run = recorder.start(id, open.cursor(), T0.plusSeconds(20000));
        recorder.finish(run, open, success("20261013170000"), T0.plusSeconds(20000));
        RunRecorder.SourceState closed = recorder.state(id);
        assertThat(closed.consecutiveFailures()).isZero();
        assertThat(closed.circuitOpenUntil()).isNull();
    }

    @Test
    void aFailureKeepsTheLastGoodCursorAndSuccessTime() {
        short id = gdelt();
        RunRecorder.SourceState before = recorder.state(id);
        recorder.finish(recorder.start(id, null, T0), before, success("20261013113000"), T0);
        fail(id, T0.plusSeconds(3600));

        assertThat(recorder.state(id).cursor()).isEqualTo("20261013113000");
        assertThat(jdbc.sql("SELECT last_success_at FROM source_status").query(java.sql.Timestamp.class).single().toInstant())
                .isEqualTo(T0);
    }
}
