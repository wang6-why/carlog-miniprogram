package com.carlog.service;

import java.time.LocalDate;

import com.carlog.enums.MaintenanceTemplate;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * 保养状态推算单测。
 *
 * 核心规则：里程、时间双维度，任一超期即超期。
 * 只算里程的话，开得少的用户永远等不到机油提醒——机油会随时间氧化。
 */
class MaintenanceCalculatorTest {

    private static final LocalDate TODAY = LocalDate.of(2026, 11, 3);

    @Test
    @DisplayName("从未保养过 -> unknown / 暂无记录")
    void neverServiced() {
        MaintenanceCalculator.Status s = MaintenanceCalculator.calc(
                MaintenanceTemplate.OIL, null, null, 50000, TODAY);
        assertEquals("unknown", s.status());
        assertEquals("暂无记录", s.statusText());
        assertNull(s.nextMileage());
        assertNull(s.nextDate());
    }

    @Test
    @DisplayName("里程和时间都还宽裕 -> normal")
    void normalCase() {
        // 上次 40000km / 2026-10-01，周期 7500km / 6 个月
        // 下次 47500km / 2027-04-01，当前 41000km
        MaintenanceCalculator.Status s = MaintenanceCalculator.calc(
                MaintenanceTemplate.OIL, LocalDate.of(2026, 10, 1), 40000, 41000, TODAY);
        assertEquals(47500, s.nextMileage());
        assertEquals("2027-04-01", s.nextDate());
        assertEquals(6500, s.remainKm());
        assertEquals(149L, s.remainDays());
        assertEquals("normal", s.status());
    }

    @Test
    @DisplayName("剩余里程 <= 500km -> soon")
    void soonByMileage() {
        // 上次 40000km，周期 7500 -> 下次 47500，当前 47100，剩 400km
        MaintenanceCalculator.Status s = MaintenanceCalculator.calc(
                MaintenanceTemplate.OIL, LocalDate.of(2026, 10, 1), 40000, 47100, TODAY);
        assertEquals(400, s.remainKm());
        assertEquals("soon", s.status());
        assertEquals("即将到期", s.statusText());
    }

    @Test
    @DisplayName("剩余天数 <= 30 天 -> soon，即使里程还很宽裕")
    void soonByDateOnly() {
        // 上次 2026-05-10，6 个月 -> 2026-11-10，今天 11-03，只剩 7 天
        // 里程才跑了 1000km，远没到 7500
        MaintenanceCalculator.Status s = MaintenanceCalculator.calc(
                MaintenanceTemplate.OIL, LocalDate.of(2026, 5, 10), 40000, 41000, TODAY);
        assertEquals(6500, s.remainKm());
        assertEquals(7L, s.remainDays());
        assertEquals("soon", s.status(), "时间维度即将到期，里程维度还早，应判 soon");
    }

    @Test
    @DisplayName("里程超期 -> overdue，即使时间还没到")
    void overdueByMileage() {
        // 下次 47500，当前 48620，超出 1120km
        MaintenanceCalculator.Status s = MaintenanceCalculator.calc(
                MaintenanceTemplate.OIL, LocalDate.of(2026, 10, 1), 40000, 48620, TODAY);
        assertEquals(-1120, s.remainKm());
        assertEquals("overdue", s.status());
        assertEquals("已超期", s.statusText());
        assertEquals(100, s.percent(), "进度条封顶 100");
    }

    @Test
    @DisplayName("时间超期 -> overdue，即使里程没到")
    void overdueByDateOnly() {
        MaintenanceCalculator.Status s = MaintenanceCalculator.calc(
                MaintenanceTemplate.OIL, LocalDate.of(2026, 1, 1), 40000, 40500, TODAY);
        assertTrue(s.remainDays() < 0);
        assertEquals("overdue", s.status());
    }

    @Test
    @DisplayName("刚好卡在临界点：剩 500km / 30 天算 soon")
    void boundaryValues() {
        MaintenanceCalculator.Status kmBoundary = MaintenanceCalculator.calc(
                MaintenanceTemplate.OIL, LocalDate.of(2026, 10, 1), 40000, 47000, TODAY);
        assertEquals(500, kmBoundary.remainKm());
        assertEquals("soon", kmBoundary.status(), "剩 500km 应为 soon（<= 阈值）");

        // 今天的 11-03 + 30 天 = 12-03，前推 6 个月 = 06-03
        MaintenanceCalculator.Status dayBoundary = MaintenanceCalculator.calc(
                MaintenanceTemplate.OIL, LocalDate.of(2026, 6, 3), 40000, 40000, TODAY);
        assertEquals(30L, dayBoundary.remainDays());
        assertEquals("soon", dayBoundary.status(), "剩 30 天应为 soon（<= 阈值）");
    }

    @Test
    @DisplayName("进度条按里程折算，且被夹在 0~100")
    void percentClamped() {
        MaintenanceCalculator.Status mid = MaintenanceCalculator.calc(
                MaintenanceTemplate.OIL, LocalDate.of(2026, 10, 1), 40000, 43750, TODAY);
        assertEquals(50, mid.percent(), "跑了一半周期 -> 50%");

        MaintenanceCalculator.Status before = MaintenanceCalculator.calc(
                MaintenanceTemplate.OIL, LocalDate.of(2026, 10, 1), 40000, 39000, TODAY);
        assertEquals(0, before.percent(), "里程倒退不应出现负进度");
    }

    @Test
    @DisplayName("状态排序：overdue < soon < unknown < normal")
    void severityOrder() {
        assertTrue(MaintenanceCalculator.severity("overdue") < MaintenanceCalculator.severity("soon"));
        assertTrue(MaintenanceCalculator.severity("soon") < MaintenanceCalculator.severity("unknown"));
        assertTrue(MaintenanceCalculator.severity("unknown") < MaintenanceCalculator.severity("normal"));
    }

    @Test
    @DisplayName("近 N 个月从早到晚，末尾是当月")
    void recentMonths() {
        var months = MaintenanceCalculator.recentMonths(TODAY, 6);
        assertEquals(6, months.size());
        assertEquals(2026, months.get(0).getYear());
        assertEquals(6, months.get(0).getMonthValue());
        assertEquals(2026, months.get(5).getYear());
        assertEquals(11, months.get(5).getMonthValue());
    }
}
