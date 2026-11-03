package com.carlog.service;

import java.time.LocalDate;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.List;

import com.carlog.enums.MaintenanceTemplate;

/**
 * 保养状态推算（服务端版）
 *
 * 规则与小程序 services/maintenance.js 一致：
 *   里程或时间，任一维度超期即超期；任一维度即将到期即即将到期。
 * 只算里程会让开得少的用户永远等不到机油提醒，而机油会随时间氧化。
 *
 * 阈值：剩余 ≤ 500km / ≤ 30 天 → 即将到期；≤ 0 → 已超期。
 */
public final class MaintenanceCalculator {

    public static final int SOON_KM = 500;
    public static final int SOON_DAYS = 30;

    private MaintenanceCalculator() {
    }

    /** 计算结果，字段与前端看板一一对应 */
    public record Status(
            String key,
            String name,
            String icon,
            String desc,
            String lastDate,
            Integer lastMileage,
            Integer nextMileage,
            String nextDate,
            Integer remainKm,
            Long remainDays,
            int percent,
            String status,
            String statusText
    ) {
    }

    /**
     * @param tpl        周期模板
     * @param lastDate   上次保养日期（从未保养传 null）
     * @param lastMileage 上次保养里程
     * @param odometer   车辆当前里程
     * @param today      今天，测试可注入
     */
    public static Status calc(MaintenanceTemplate tpl, LocalDate lastDate, Integer lastMileage,
                              int odometer, LocalDate today) {

        if (lastDate == null || lastMileage == null) {
            return new Status(tpl.getKey(), tpl.getName(), tpl.getIcon(), tpl.getDesc(),
                    null, null, null, null, null, null, 0, "unknown", "暂无记录");
        }

        Integer nextMileage = tpl.getKmCycle() == null ? null : lastMileage + tpl.getKmCycle();
        LocalDate nextDate = tpl.getMonthCycle() == null
                ? null : FuelCalculator.addMonths(lastDate, tpl.getMonthCycle());

        Integer remainKm = nextMileage == null ? null : nextMileage - odometer;
        Long remainDays = nextDate == null ? null : FuelCalculator.daysBetween(today, nextDate);

        // 进度条：优先用里程（更贴近驾驶习惯）；没有里程周期就按时间折算
        int percent;
        if (tpl.getKmCycle() != null) {
            percent = (int) Math.round((odometer - lastMileage) * 100.0 / tpl.getKmCycle());
        } else {
            long passed = FuelCalculator.daysBetween(lastDate, today);
            long total = tpl.getMonthCycle() * 304L / 10L;
            percent = total <= 0 ? 0 : (int) Math.round(passed * 100.0 / total);
        }
        percent = Math.max(0, Math.min(100, percent));

        String status;
        if ((remainKm != null && remainKm <= 0) || (remainDays != null && remainDays <= 0)) {
            status = "overdue";
        } else if ((remainKm != null && remainKm <= SOON_KM)
                || (remainDays != null && remainDays <= SOON_DAYS)) {
            status = "soon";
        } else {
            status = "normal";
        }

        String text = switch (status) {
            case "overdue" -> "已超期";
            case "soon" -> "即将到期";
            default -> "正常";
        };

        return new Status(tpl.getKey(), tpl.getName(), tpl.getIcon(), tpl.getDesc(),
                lastDate.toString(), lastMileage, nextMileage,
                nextDate == null ? null : nextDate.toString(),
                remainKm, remainDays, percent, status, text);
    }

    /** 状态排序权重：超期最前 */
    public static int severity(String status) {
        return switch (status) {
            case "overdue" -> 0;
            case "soon" -> 1;
            case "unknown" -> 2;
            default -> 3;
        };
    }

    /** 近 N 个月的年月标签，用于统计补空月 */
    public static List<YearMonth> recentMonths(LocalDate today, int count) {
        List<YearMonth> list = new ArrayList<>(count);
        YearMonth cur = YearMonth.from(today);
        for (int i = count - 1; i >= 0; i--) {
            list.add(cur.minusMonths(i));
        }
        return list;
    }
}
