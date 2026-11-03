package com.carlog.service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;

/**
 * 油耗算法单测。
 *
 * 期望值都是对着小程序 services/fuel.js 的真实输出反算的，
 * 不是凭感觉写的——两套实现必须给出一模一样的数字。
 */
class FuelCalculatorTest {

    private static FuelCalculator.Row row(int mileage, String liters, boolean full) {
        return new FuelCalculator.Row(mileage, new BigDecimal(liters), full);
    }

    @Test
    @DisplayName("首个满油点只作基准，不产生油耗")
    void firstFullIsBaseline() {
        List<FuelCalculator.Segment> segs = FuelCalculator.segment(List.of(
                row(10000, "45", true)
        ));
        assertEquals(1, segs.size());
        assertNull(segs.get(0).consumption());
        assertEquals(BigDecimal.ZERO, segs.get(0).segmentLiters());
        assertEquals(0, segs.get(0).segmentKm());
    }

    @Test
    @DisplayName("两次加满之间只有一条记录，正常结算")
    void singleSegment() {
        // 10000km 加满 45L -> 10500km 加满 38L
        // 跑了 500km 用了 38L => 38/500*100 = 7.6
        List<FuelCalculator.Segment> segs = FuelCalculator.segment(List.of(
                row(10000, "45", true),
                row(10500, "38", true)
        ));
        FuelCalculator.Segment second = segs.get(1);
        assertEquals(500, second.segmentKm());
        assertEquals(new BigDecimal("38"), second.segmentLiters());
        assertEquals(new BigDecimal("7.60"), second.consumption());
    }

    @Test
    @DisplayName("中间有非加满记录，油量累加到下一次加满一起结算")
    void partialFillAccumulates() {
        // 10000 加满 -> 10200 加 20L（非满）-> 10500 加满 18L
        // 区间 500km，总油量 20+18=38L => 7.6
        List<FuelCalculator.Segment> segs = FuelCalculator.segment(List.of(
                row(10000, "45", true),
                row(10200, "20", false),
                row(10500, "18", true)
        ));
        assertNull(segs.get(1).consumption());
        assertEquals(500, segs.get(2).segmentKm());
        assertEquals(new BigDecimal("38"), segs.get(2).segmentLiters());
        assertEquals(new BigDecimal("7.60"), segs.get(2).consumption());
    }

    @Test
    @DisplayName("平均油耗按里程加权，不是各段算术平均")
    void averageIsWeightedByMileage() {
        // 区间 A：1000km 用 60L => 6.00
        // 区间 B：100km 用 10L  => 10.00
        // 算术平均 = 8.00（错），加权 = 70/1100*100 = 6.36（对）
        List<FuelCalculator.Row> rows = List.of(
                row(10000, "50", true),   // 基准
                row(11000, "60", true),   // 6.00
                row(11100, "10", true)    // 10.00
        );
        BigDecimal avg = FuelCalculator.average(rows);
        assertNotNull(avg);
        assertEquals(new BigDecimal("6.36"), avg);

        BigDecimal arithmetic = new BigDecimal("6.00").add(new BigDecimal("10.00"))
                .divide(BigDecimal.valueOf(2), 2, java.math.RoundingMode.HALF_UP);
        assertEquals(new BigDecimal("8.00"), arithmetic, "算术平均应为 8.00，用于反证加权结果不同");
    }

    @Test
    @DisplayName("最新油耗取最后一次可结算的区间")
    void latestTakesLastSegment() {
        List<FuelCalculator.Row> rows = List.of(
                row(10000, "50", true),
                row(11000, "60", true),   // 6.00
                row(11100, "10", true)    // 10.00
        );
        assertEquals(new BigDecimal("10.00"), FuelCalculator.latest(rows));
    }

    @Test
    @DisplayName("没有两个满油点时平均油耗为 null")
    void noValidSegmentReturnsNull() {
        assertNull(FuelCalculator.average(List.of(row(10000, "45", true))));
        assertNull(FuelCalculator.average(List.of(
                row(10000, "45", true),
                row(10200, "20", false)
        )));
        assertNull(FuelCalculator.average(List.of()));
    }

    @Test
    @DisplayName("里程相同或倒退时不结算，避免除零和负里程")
    void zeroDistanceIsSkipped() {
        List<FuelCalculator.Segment> segs = FuelCalculator.segment(List.of(
                row(10000, "45", true),
                row(10000, "30", true)
        ));
        assertEquals(0, segs.get(1).segmentKm());
        assertNull(segs.get(1).consumption());
        assertNull(FuelCalculator.average(List.of(
                row(10000, "45", true),
                row(10000, "30", true)
        )));
    }

    @Test
    @DisplayName("加月份处理月末溢出：1月31日 + 1月 = 2月28/29日")
    void addMonthsHandlesMonthEnd() {
        assertEquals(LocalDate.of(2026, 2, 28), FuelCalculator.addMonths(LocalDate.of(2026, 1, 31), 1));
        // 2028 是闰年
        assertEquals(LocalDate.of(2028, 2, 29), FuelCalculator.addMonths(LocalDate.of(2028, 1, 31), 1));
        // plusMonths 只在目标月天数不足时才收缩（1-31 -> 2-28），
        // 从 6-30 加 6 个月得 12-30 而非 12-31，这是 JDK 的正确语义
        assertEquals(LocalDate.of(2026, 12, 30), FuelCalculator.addMonths(LocalDate.of(2026, 6, 30), 6));
    }

    @Test
    @DisplayName("天数差按 target - today 计算，可为负")
    void daysBetween() {
        assertEquals(30, FuelCalculator.daysBetween(
                LocalDate.of(2026, 3, 1), LocalDate.of(2026, 3, 31)));
        assertEquals(-5, FuelCalculator.daysBetween(
                LocalDate.of(2026, 3, 10), LocalDate.of(2026, 3, 5)));
    }
}
