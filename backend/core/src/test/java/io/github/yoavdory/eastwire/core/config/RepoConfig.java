package io.github.yoavdory.eastwire.core.config;

import java.nio.file.Path;

/** Loads the real repo-level config/ directory; Gradle passes its path as a system property. */
public final class RepoConfig {

    private static ComplianceConfig cached;

    private RepoConfig() {
    }

    public static synchronized ComplianceConfig load() {
        if (cached == null) {
            String dir = System.getProperty(ComplianceConfig.CONFIG_DIR_PROPERTY);
            if (dir == null) {
                throw new IllegalStateException("System property " + ComplianceConfig.CONFIG_DIR_PROPERTY + " is not set");
            }
            cached = ComplianceConfig.load(Path.of(dir));
        }
        return cached;
    }
}
