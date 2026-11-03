# 车迹后端服务（Spring Boot 3）

为「车迹」养车记账小程序配套的 REST 后端。微信小程序与管理后台共用同一套接口，油耗与保养算法从 JS 端逐行迁移到 Java，**保证前后端数字一致**。

## 技术栈

- Spring Boot 3.3.5 / Java 21
- MyBatis-Plus 3.5.x
- JJWT（token 鉴权）
- H2（默认，内存，零外部依赖）/ MySQL 8（生产 profile）
- SpringDoc（在线接口文档：`/doc.html`）

## 目录结构

```
server/
├── src/main/java/com/carlog/
│   ├── CarlogApplication.java
│   ├── config/          AuthInterceptor(JWT) / DataSeeder / Swagger 配置
│   ├── controller/      Auth / Car / FuelLog / Maintenance / Dashboard
│   ├── service/         业务 + 算法（FuelCalculator / MaintenanceCalculator）
│   ├── entity/ mapper/ dto/ common(R 统一返回 / UserContext) enums/
│   └── ...
├── src/main/resources/
│   ├── application.yml          主配置（端口 8088 / context-path /api）
│   ├── application-h2.yml       默认 profile
│   ├── application-mysql.yml    MySQL profile
│   └── db/schema.sql            建表（H2/MySQL 双兼容）
├── src/test/                    29 项测试
├── Dockerfile                   多阶段构建（Maven → JRE 21）
└── pom.xml
```

## 快速开始

### 方式一：H2 模式（推荐，零外部依赖）

```bash
cd server
# 需要 Maven 3.9+（本机示例路径：/d/develop/apache-maven-3.9.4/bin/mvn）
export PATH=/d/develop/apache-maven-3.9.4/bin:$PATH

mvn -B package
java -jar target/carlog-server.jar --server.port=8088
# 或开发期直接跑（热加载更友好）：mvn spring-boot:run
```

- 默认走 `h2` profile，启动即建内存表并灌入演示数据（`carlog.seed.enabled=true`）。
- 接口统一前缀 `/api`，例如 `POST /api/auth/login`。
- Swagger UI：`http://localhost:8088/doc.html`

**演示账号**

| 用户名 | 密码 | 角色 |
|---|---|---|
| demo | 123456 | 普通用户（含 2 辆车 / 加油 / 保养演示数据） |
| admin | admin123 | 管理员 |

### 方式二：MySQL 模式（持久化 / 生产）

最简单的一键起法（仓库根目录）：

```bash
cd <仓库根>
docker compose up -d      # 拉起 MySQL 8 + 后端，自动建库建表灌数据
```

等效于后端加 `-Dspring.profiles.active=mysql`，连接 docker 内的 MySQL。也可外接你自己的 MySQL：

```bash
export MYSQL_HOST=localhost MYSQL_PORT=3306 MYSQL_USER=root MYSQL_PASSWORD=root
cd server
mvn spring-boot:run -Dspring-boot.run.profiles=mysql
```

| 环境变量 | 默认值 | 说明 |
|---|---|---|
| `SPRING_PROFILES_ACTIVE` | `h2` | 设为 `mysql` 启用持久化 |
| `MYSQL_HOST` / `MYSQL_PORT` | `localhost` / `3306` | 数据库连接地址 |
| `MYSQL_USER` / `MYSQL_PASSWORD` | `root` / `root` | 数据库账号 |
| `CARLOG_JWT_SECRET` | 本地演示密钥 | **生产务必改成强随机值**（建议密钥管理服务注入） |

> H2 与 MySQL 共用同一份 `db/schema.sql`。DDL 已规避 H2 保留字问题（见「已知坑」）。

## 接口一览（省略 `/api` 前缀）

| 模块 | 方法 | 路径 | 说明 |
|---|---|---|---|
| 认证 | POST | `/auth/register` | 注册 |
| 认证 | POST | `/auth/login` | 登录，返回 JWT |
| 认证 | GET | `/auth/me` | 当前用户（需登录） |
| 车辆 | GET | `/cars` | 我的车辆列表 |
| 车辆 | GET / POST / PUT / DELETE | `/cars/{id?}` | 车辆 CRUD（仅本人数据） |
| 加油 | GET / POST / PUT / DELETE | `/fuel-logs[/{id}]` | 加油记录 CRUD |
| 保养 | GET | `/maintenance/templates` | 保养周期模板（前端下拉用） |
| 保养 | GET / POST / PUT / DELETE | `/maintenance/logs[/{id}]` | 保养记录 CRUD |
| 保养 | GET | `/maintenance/board?carId=` | 保养看板（8 项 + 剩余里程/天数 + 状态） |
| 保养 | GET | `/maintenance/alerts?carId=` | 即将到期 / 超期项 |
| 看板 | GET | `/dashboard/overview/{carId}` | 首页总览（一次拿全） |
| 看板 | GET | `/dashboard/monthly/{carId}?months=6` | 近 N 个月油费 / 保养费（1–24） |

所有业务接口需在 Header 携带 `Authorization: Bearer <token>`（登录拿到的 `token` 字段）。
统一返回结构：`{ "code": 0, "message": "ok", "data": ... }`；
JWT 缺失或失效返回 **HTTP 401**（不是 200 + code 字段，前端/小程序请按状态码判断）。

## 算法（与小程序同源）

- **加满法油耗**：见 `service/FuelCalculator`，与小程序 `services/fuel.js` 逐行对齐。`DashboardVO.avgConsumption` 在演示数据下应为 **7.4 L/100km**，可作为前后端一致性的快速校验点。
- **双维度保养**：见 `service/MaintenanceCalculator`，`nextMileage = lastMileage + kmCycle`、`nextDate = addMonths(lastDate, monthCycle)`；剩余里程或天数任一 ≤0 为超期，≤500km 或 ≤30 天为即将到期。

## 测试

```bash
mvn -B test
# 共 29 项：
#   FuelCalculatorTest(10) + MaintenanceCalculatorTest(10) + CarlogApiTest(9, MockMvc + H2 + 拦截器)
```

`CarlogApiTest` 覆盖：未带 token 返回 401、错误密码拒绝、me、车辆 CRUD、加油记录 CRUD、看板总览、加一笔加油后统计联动、参数校验等。

## 部署

- 镜像：`docker build -t carlog-server ./server`（多阶段，最终镜像仅含 JRE 21）。
- 编排：仓库根 `docker-compose.yml`（`docker compose up -d`），后端暴露 `8088`。
- 前端对接：管理后台 `admin/` 与微信小程序均连 `http://<后端>/api`。
- 生产注意：
  - 小程序真机连后端需 **HTTPS + ICP 备案域名 + 微信后台白名单**；本仓库默认演示用，生产请置于反向代理（Nginx 等）后并开启 TLS。
  - 务必通过 `CARLOG_JWT_SECRET` 注入强密钥，不要使用默认值。

## 已知坑（重要）

1. **H2 保留字 `year`**：实体属性曾用 `private Integer year`，MyBatis-Plus 会生成 `model_year AS year` 非法别名 → `Syntax error`。已把字段改名 `modelYear`（列 `model_year`），并设 `mybatis-plus.configuration.column-format: "%s"` 只输出列名、靠驼峰映射回属性。改字段名时务必同步 entity / request / `schema.sql` / `DataSeeder`。
2. **拦截器必须返回真 401**：鉴权失败要用 `response.setStatus(HttpStatus.SC_UNAUTHORIZED)` 再写 body；只写 body 会让上游拿不到 401，接口测试失败。
3. **H2 / MySQL DDL 差异**：`schema.sql` 已规避保留字与类型差异；切 MySQL 时留意自增主键、`TEXT` 与日期类型的写法。
4. **JWT 密钥**：默认是本地演示值，生产务必通过 `CARLOG_JWT_SECRET` 环境变量注入，禁止写死在代码里。
