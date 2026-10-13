import org.springframework.boot.gradle.plugin.SpringBootPlugin

plugins {
    id("org.springframework.boot") version "4.1.1" apply false
    id("io.spring.dependency-management") version "1.1.7" apply false
}

// The repo-level config/ directory (sources.yaml, domains.yaml, cities.csv, ...).
val complianceConfigDir = rootProject.projectDir.resolve("../config").canonicalPath

subprojects {
    apply(plugin = "java")
    apply(plugin = "io.spring.dependency-management")

    group = "io.github.yoavdory.eastwire"
    version = "0.1.0-SNAPSHOT"

    repositories {
        mavenCentral()
    }

    extensions.configure<JavaPluginExtension> {
        toolchain {
            languageVersion = JavaLanguageVersion.of(21)
        }
    }

    extensions.configure<io.spring.gradle.dependencymanagement.dsl.DependencyManagementExtension> {
        imports {
            mavenBom(SpringBootPlugin.BOM_COORDINATES)
        }
    }

    tasks.withType<JavaCompile>().configureEach {
        options.compilerArgs.addAll(listOf("-Xlint:all,-processing", "-Werror", "-parameters"))
    }

    // `./gradlew :ingest:bootRun` and `:api:bootRun` read the repo-level config/ directory.
    tasks.withType<JavaExec>().configureEach {
        systemProperty("eastwire.config-dir", complianceConfigDir)
    }

    tasks.withType<Test>().configureEach {
        useJUnitPlatform()
        systemProperty("eastwire.config-dir", complianceConfigDir)
        // Tests read config/ at runtime: a changed source or domain decision must re-run them.
        inputs.dir(complianceConfigDir).withPathSensitivity(PathSensitivity.RELATIVE)
        testLogging {
            events("failed", "skipped")
            exceptionFormat = org.gradle.api.tasks.testing.logging.TestExceptionFormat.FULL
        }
    }
}
