package com.carlog.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

/**
 * 油耗计算引擎（服务端版）
 *
 * 与小程序 services/fuel.js 保持完全一致的算法，两份实现有一致性测试兜底
 * （FuelCalcTest 里对着 JS 版算出来的具体数字断言）。
 *
 * ============ 算法要点 ============
 * 1. 只有「两次加满」之间的油量才能结算油耗。非加满时不知道油箱剩多少，
 *    也无法确定这次油对应哪一段路。
 * 2. 平均油耗必须按里程加权：总油量 / 总里程，不能对各段油耗求算术平均。
 *    举例：一段 100km 用 10L（10L/100km），一段 1000km 用 60L（6L/100km），
 *    算术平均 8.0，真实加权 6.36——差 1.6 个油，看着像车坏了。
 */
public final class FuelCalculator {

    private FuelCalculator() {
    }

    /** 参与计算的最小记录结构，避免和实体强耦合 */
    public record Row(int mileage, BigDecimal liters, boolean full) {
    }

    /** 单段结算结果 */
    public record Segment(int mileage, BigDecimal segmentLiters, int segmentKm,
                          BigDecimal consumption) {
    }

    /**
     * 逐段结算
     *
     * @param rows 需已按 mileage 升序
     * @return 与输入等长的结果，无法结算的位置 consumption 为 null
     */
    public static List<Segment> segment(List<Row> rows) {
        List<Segment> out = new ArrayList<>(rows.size());
        Row prevFull = null;
        BigDecimal pendingLiters = BigDecimal.ZERO;

        for (Row row : rows) {
            BigDecimal consumption = null;
            BigDecimal segmentLiters = BigDecimal.ZERO;
            int segmentKm = 0;

            if (prevFull != null) {
                // 本次油量先累加，再判断本次能否结算
                pendingLiters = pendingLiters.add(row.liters());

                if (row.full()) {
                    segmentKm = row.mileage() - prevFull.mileage();
                    segmentLiters = pendingLiters;
                    if (segmentKm > 0) {
                        consumption = segmentLiters
                                .multiply(BigDecimal.valueOf(100))
                                .divide(BigDecimal.valueOf(segmentKm), 2, RoundingMode.HALF_UP);
                    }
                    // 结算后清空，下一段重新累积
                    pendingLiters = BigDecimal.ZERO;
                    prevFull = row;
                }
            } else if (row.full()) {
                // 首个满油点只作为基准，不产生油耗值
                prevFull = row;
            }

            out.add(new Segment(row.mileage(), segmentLiters, segmentKm, consumption));
        }
        return out;
    }

    /** 加权平均油耗 L/100km，无有效区间返回 null */
    public static BigDecimal average(List<Row> rows) {
        List<Segment> segs = segment(rows);
        BigDecimal totalLiters = BigDecimal.ZERO;
        long totalKm = 0;
        for (Segment s : segs) {
            if (s.consumption() != null) {
                totalLiters = totalLiters.add(s.segmentLiters());
                totalKm += s.segmentKm();
            }
        }
        if (totalKm <= 0) {
            return null;
        }
        return totalLiters.multiply(BigDecimal.valueOf(100))
                .divide(BigDecimal.valueOf(totalKm), 2, RoundingMode.HALF_UP);
    }

    /** 最近一次可结算的油耗 */
    public static BigDecimal latest(List<Row> rows) {
        List<Segment> segs = segment(rows);
        for (int i = segs.size() - 1; i >= 0; i--) {
            if (segs.get(i).consumption() != null) {
                return segs.get(i).consumption();
            }
        }
        return null;
    }

    /**
     * 加月份：处理月末溢出
     *
     * LocalDate.plusMonths 本身就能正确处理（1-31 + 1 月 → 2-28/29），
     * 这里保留这层封装是为了语义明确，也方便单测直接打。
     */
    public static LocalDate addMonths(LocalDate date, int months) {
        return date.plusMonths(months);
    }

    /** 天数差：target - today */
    public static long daysBetween(LocalDate today, LocalDate target) {
        return java.time.temporal.ChronoUnit.DAYS.between(today, target);
    }
}
