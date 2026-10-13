plugins {
    // Downloads the Java 21 toolchain automatically when it isn't installed locally.
    id("org.gradle.toolchains.foojay-resolver-convention") version "1.0.0"
}

rootProject.name = "eastwire"

include("core", "ingest", "api")
