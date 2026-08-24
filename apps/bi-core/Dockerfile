FROM maven:3.9-eclipse-temurin-21 AS build

WORKDIR /workspace
COPY apps/bi-core/pom.xml apps/bi-core/pom.xml
RUN mvn -f apps/bi-core/pom.xml dependency:go-offline -DskipTests
COPY apps/bi-core/src apps/bi-core/src
RUN mvn -f apps/bi-core/pom.xml package -DskipTests

FROM eclipse-temurin:21-jre-jammy
RUN apt-get update \
    && apt-get install --no-install-recommends --yes curl \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=build /workspace/apps/bi-core/target/bi-core-0.1.0.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
