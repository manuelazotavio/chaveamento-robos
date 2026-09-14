# build
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app

# baixa as dependencias numa camada separada, so refeita quando o pom muda
COPY pom.xml .
RUN mvn -B dependency:go-offline

COPY src ./src
RUN mvn -B clean package -DskipTests

# runtime
FROM eclipse-temurin:21-jre
WORKDIR /app

COPY --from=build /app/target/*.jar app.jar

# o Railway injeta PORT; application.properties ja le server.port=${PORT:8080}
EXPOSE 8080
ENTRYPOINT ["sh", "-c", "java -jar app.jar"]
