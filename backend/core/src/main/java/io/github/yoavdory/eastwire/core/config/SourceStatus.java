package io.github.yoavdory.eastwire.core.config;

/** Permission status from the source matrix (docs/source-matrix.md). */
public enum SourceStatus {
    /** Usable now under the stated conditions. */
    VERIFIED,
    /** Disabled until the listed condition is met. */
    CONDITIONAL,
    /** Never used, directly or indirectly, without written permission. */
    EXCLUDED
}
