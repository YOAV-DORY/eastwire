// The hourly ingestion job: a Spring Boot command-line app (no web server).
// It syncs config/ into the database, runs the connectors, then exits.
plugins {
    id("org.springframework.boot")
}

dependencies {
    implementation(project(":core"))
    implementation("org.springframework.boot:spring-boot-starter-jdbc")
    implementation("org.springframework.boot:spring-boot-starter-flyway")
    implementation("org.flywaydb:flyway-database-postgresql")
    implementation("com.rometools:rome:2.1.0")
    implementation("org.jsoup:jsoup:1.23.2")
    runtimeOnly("org.postgresql:postgresql")

    testImplementation(testFixtures(project(":core")))
    testImplementation("org.springframework.boot:spring-boot-starter-jdbc-test")
    testImplementation("org.springframework.boot:spring-boot-starter-flyway-test")
    testImplementation("org.springframework.boot:spring-boot-testcontainers")
    testImplementation("org.testcontainers:testcontainers-junit-jupiter")
    testImplementation("org.testcontainers:testcontainers-postgresql")
    testRuntimeOnly("org.junit.platform:junit-platform-launcher")
}

// A fixed name, so the hourly GitHub Actions job can run `java -jar .../eastwire-ingest.jar`.
tasks.named<org.springframework.boot.gradle.tasks.bundling.BootJar>("bootJar") {
    archiveFileName = "eastwire-ingest.jar"
}
