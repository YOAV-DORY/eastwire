# The public API image for Render (free web service). Build from the repository root:
#   docker build -f backend/api/Dockerfile .
# The image contains the API jar and the compliance config it reads at startup.

FROM eclipse-temurin:21-jdk AS build
WORKDIR /src
COPY backend/ backend/
COPY config/ config/
WORKDIR /src/backend
RUN ./gradlew :api:bootJar --no-daemon --console=plain

FROM eclipse-temurin:21-jre
RUN useradd --system --uid 10001 --home-dir /app eastwire
WORKDIR /app
COPY --from=build /src/backend/api/build/libs/eastwire-api.jar app.jar
COPY config/ config/
# Render's free instance has 512 MB: keep the heap well inside it and start fast.
ENV EASTWIRE_CONFIG_DIR=/app/config \
    JAVA_TOOL_OPTIONS="-XX:MaxRAMPercentage=70 -XX:+UseSerialGC -Xss512k -XX:TieredStopAtLevel=1"
USER eastwire
EXPOSE 8080
CMD ["java", "-jar", "app.jar"]
