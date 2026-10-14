// Plain Java library shared by `ingest` and `api`: compliance config, display policy,
// and the Flyway migrations. No Spring here, so it is fast to test.
plugins {
    `java-library`
}

dependencies {
    api("tools.jackson.dataformat:jackson-dataformat-yaml")
    api("tools.jackson.dataformat:jackson-dataformat-csv")

    testImplementation("org.junit.jupiter:junit-jupiter")
    testImplementation("org.junit.jupiter:junit-jupiter-params")
    testImplementation("org.assertj:assertj-core")
    testRuntimeOnly("org.junit.platform:junit-platform-launcher")
}
