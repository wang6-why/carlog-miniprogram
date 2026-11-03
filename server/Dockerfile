# ---- 构建阶段：用 Maven 打包 ----
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app
COPY pom.xml .
RUN mvn -B -q dependency:go-offline || true
COPY src ./src
RUN mvn -B -q -DskipTests package

# ---- 运行阶段：只装 JRE ----
FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=build /app/target/carlog-server.jar app.jar
EXPOSE 8088
ENTRYPOINT ["java", "-jar", "app.jar"]
