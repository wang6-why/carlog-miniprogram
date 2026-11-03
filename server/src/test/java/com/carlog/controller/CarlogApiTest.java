package com.carlog.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * 接口层集成测试：走完整的 Spring 上下文 + H2 + 拦截器鉴权。
 *
 * 重点覆盖三件事：
 *   1. 未带 token 必须 401，不能白拿数据
 *   2. 登录后能正常拿到种子数据的车辆 / 加油 / 保养 / 统计
 *   3. 写接口的闭环——新增加油记录后，统计里的总金额要跟着变
 */
@SpringBootTest(properties = {
        "spring.profiles.active=h2",
        "carlog.seed.enabled=true"
})
@AutoConfigureMockMvc
class CarlogApiTest {

    @Autowired
    private MockMvc mvc;

    @Autowired
    private ObjectMapper om;

    private String token;

    @BeforeEach
    void login() throws Exception {
        MvcResult result = mvc.perform(post("/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"demo\",\"password\":\"123456\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(0))
                .andReturn();
        JsonNode body = om.readTree(result.getResponse().getContentAsString());
        token = body.path("data").path("token").asText();
        assertNotEquals("", token, "登录应返回 token");
    }

    private String auth() {
        return "Bearer " + token;
    }

    @Test
    @DisplayName("未登录访问业务接口返回 401")
    void unauthorizedWithoutToken() throws Exception {
        mvc.perform(get("/cars"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("错误密码登录失败且不返回 token")
    void loginWithWrongPassword() throws Exception {
        mvc.perform(post("/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"demo\",\"password\":\"wrong\"}"))
                .andExpect(jsonPath("$.code").value(org.hamcrest.Matchers.not(0)))
                .andExpect(jsonPath("$.data.token").doesNotExist());
    }

    @Test
    @DisplayName("/auth/me 能拿到当前登录用户")
    void currentUser() throws Exception {
        mvc.perform(get("/auth/me").header("Authorization", auth()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.username").value("demo"))
                .andExpect(jsonPath("$.data.password").doesNotExist());
    }

    @Test
    @DisplayName("车辆列表返回种子数据，且年款字段映射正确")
    void listCars() throws Exception {
        mvc.perform(get("/cars").header("Authorization", auth()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(0))
                .andExpect(jsonPath("$.data.length()").value(2))
                .andExpect(jsonPath("$.data[0].brand").value("大众"))
                .andExpect(jsonPath("$.data[0].modelYear").exists());
    }

    @Test
    @DisplayName("加油记录、保养模板、保养记录都能按车辆取到")
    void listLogs() throws Exception {
        long carId = firstCarId();

        mvc.perform(get("/fuel-logs?carId=" + carId).header("Authorization", auth()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(org.hamcrest.Matchers.greaterThan(5)));

        mvc.perform(get("/maintenance/templates").header("Authorization", auth()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(org.hamcrest.Matchers.greaterThan(3)));

        mvc.perform(get("/maintenance/logs?carId=" + carId).header("Authorization", auth()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(0));
    }

    @Test
    @DisplayName("统计接口给出油耗、总金额与保养告警")
    void dashboardOverview() throws Exception {
        long carId = firstCarId();
        MvcResult result = mvc.perform(get("/dashboard/overview/" + carId).header("Authorization", auth()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(0))
                .andReturn();

        JsonNode data = om.readTree(result.getResponse().getContentAsString()).path("data");
        assertTrue(data.path("avgConsumption").asDouble() > 0, "平均油耗应大于 0");
        assertTrue(data.path("totalAmount").asDouble() > 0, "总花费应大于 0");
        assertTrue(data.path("recordCount").asInt() > 0, "记录条数应大于 0");
        assertTrue(data.path("odometer").asInt() > 0, "里程应大于 0");
    }

    @Test
    @DisplayName("月度统计返回连续 6 个月，且 total = fuel + maintenance")
    void dashboardMonthly() throws Exception {
        long carId = firstCarId();
        MvcResult result = mvc.perform(get("/dashboard/monthly/" + carId).header("Authorization", auth()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(6))
                .andReturn();

        JsonNode arr = om.readTree(result.getResponse().getContentAsString()).path("data");
        for (JsonNode m : arr) {
            double fuel = m.path("fuel").asDouble();
            double maint = m.path("maintenance").asDouble();
            double total = m.path("total").asDouble();
            assertEquals(total, fuel + maint, 0.01,
                    m.path("ym").asText() + " 的 total 应等于 fuel + maintenance");
        }
    }

    @Test
    @DisplayName("新增加油记录后，统计总花费增加、记录数 +1")
    void createFuelLogUpdatesDashboard() throws Exception {
        long carId = firstCarId();
        double before = overviewNumber(carId, "totalAmount");
        int beforeCount = (int) overviewNumber(carId, "recordCount");

        // 用当前里程 +600 记一笔满油，金额 300
        int odo = (int) overviewNumber(carId, "odometer");
        String body = String.format("""
                {
                  "carId": %d,
                  "mileage": %d,
                  "liters": 40.5,
                  "price": 7.4,
                  "amount": 300,
                  "full": true,
                  "station": "测试加油站",
                  "fuelDate": "%s"
                }
                """, carId, odo + 600, java.time.LocalDate.now());

        mvc.perform(post("/fuel-logs")
                        .header("Authorization", auth())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(0));

        assertEquals(before + 300, overviewNumber(carId, "totalAmount"), 0.01);
        assertEquals(beforeCount + 1, (int) overviewNumber(carId, "recordCount"));
        // 里程会同步成最大值
        assertEquals(odo + 600, (int) overviewNumber(carId, "odometer"));
    }

    @Test
    @DisplayName("新增加油记录时里程小于当前值应被拒绝")
    void createFuelLogRejectsLowerMileage() throws Exception {
        long carId = firstCarId();
        int odo = (int) overviewNumber(carId, "odometer");
        String body = String.format("""
                {
                  "carId": %d,
                  "mileage": %d,
                  "liters": 40,
                  "price": 7.4,
                  "amount": 296,
                  "full": true,
                  "fuelDate": "%s"
                }
                """, carId, Math.max(0, odo - 1000), java.time.LocalDate.now());

        MvcResult result = mvc.perform(post("/fuel-logs")
                        .header("Authorization", auth())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andReturn();
        JsonNode resp = om.readTree(result.getResponse().getContentAsString());
        assertNotEquals(0, resp.path("code").asInt(), "里程倒退应返回业务错误而不是 200");
    }

    @Test
    @DisplayName("参数校验：品牌为空应返回校验错误")
    void validationOnCarCreate() throws Exception {
        mvc.perform(post("/cars")
                        .header("Authorization", auth())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"brand\":\"\",\"model\":\"\"}"))
                .andExpect(jsonPath("$.code").value(org.hamcrest.Matchers.not(0)));
    }

    // ---------- helpers ----------

    private long firstCarId() throws Exception {
        MvcResult result = mvc.perform(get("/cars").header("Authorization", auth()))
                .andExpect(status().isOk())
                .andReturn();
        JsonNode arr = om.readTree(result.getResponse().getContentAsString()).path("data");
        assertTrue(arr.size() > 0, "种子数据应至少有一辆车");
        return arr.get(0).path("id").asLong();
    }

    private double overviewNumber(long carId, String field) throws Exception {
        MvcResult result = mvc.perform(get("/dashboard/overview/" + carId).header("Authorization", auth()))
                .andExpect(status().isOk())
                .andReturn();
        return om.readTree(result.getResponse().getContentAsString())
                .path("data").path(field).asDouble();
    }
}
