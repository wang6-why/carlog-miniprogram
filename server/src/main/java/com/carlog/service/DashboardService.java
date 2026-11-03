package com.carlog.service;

import com.carlog.dto.DashboardVO;
import com.carlog.entity.Car;
import com.carlog.entity.FuelLog;
import com.carlog.entity.MaintenanceLog;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;

@Service
public class DashboardService {

    private final CarService carService;
    private final FuelLogService fuelLogService;
    private final MaintenanceService maintenanceService;

    public DashboardService(CarService carService, FuelLogService fuelLogService,
                            MaintenanceService maintenanceService) {
        this.carService = carService;
        this.fuelLogService = fuelLogService;
        this.maintenanceService = maintenanceService;
    }

    public DashboardVO overview(Long carId, Long userId) {
        Car car = carService.requireOwned(carId, userId);
        List<FuelLog> logs = fuelLogService.listByCar(carId, userId);

        List<FuelCalculator.Row> rows = logs.stream()
                .map(l -> new FuelCalculator.Row(l.getMileage(), l.getLiters(),
                        Boolean.TRUE.equals(l.getIsFull())))
                .toList();

        List<FuelCalculator.Segment> segs = FuelCalculator.segment(rows);
        List<BigDecimal> valid = segs.stream()
                .map(FuelCalculator.Segment::consumption)
                .filter(java.util.Objects::nonNull)
                .toList();

        DashboardVO vo = new DashboardVO();
        vo.setCarId(car.getId());
        vo.setCarName(car.getBrand() + " " + car.getModel());
        vo.setPlate(car.getPlate());
        vo.setColor(car.getColor());
        vo.setOdometer(car.getOdometer());

        vo.setLatestConsumption(valid.isEmpty() ? null : valid.get(valid.size() - 1));
        vo.setAvgConsumption(FuelCalculator.average(rows));
        if (valid.size() >= 2) {
            vo.setTrend(valid.get(valid.size() - 1).subtract(valid.get(valid.size() - 2)));
        }

        BigDecimal totalAmount = logs.stream()
                .map(FuelLog::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        vo.setTotalAmount(totalAmount);
        vo.setRecordCount(logs.size());

        int totalKm = 0;
        if (logs.size() >= 2) {
            int min = logs.stream().mapToInt(FuelLog::getMileage).min().orElse(0);
            int max = logs.stream().mapToInt(FuelLog::getMileage).max().orElse(0);
            totalKm = max - min;
        }
        vo.setTotalKm(totalKm);
        vo.setCostPerKm(totalKm > 0
                ? totalAmount.divide(BigDecimal.valueOf(totalKm), 2, RoundingMode.HALF_UP)
                : null);

        YearMonth now = YearMonth.now();
        BigDecimal monthSpend = logs.stream()
                .filter(l -> YearMonth.from(java.time.LocalDate.parse(l.getFuelDate())).equals(now))
                .map(FuelLog::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        vo.setMonthSpend(monthSpend);

        vo.setAlerts(maintenanceService.alerts(carId, userId));
        return vo;
    }

    /**
     * 近 N 个月统计
     *
     * 空月份必须补 0，否则前端柱状图会跳格。
     */
    public List<Map<String, Object>> monthly(Long carId, Long userId, int months) {
        carService.requireOwned(carId, userId);
        List<FuelLog> logs = fuelLogService.listByCar(carId, userId);
        List<MaintenanceLog> maint = maintenanceService.listByCar(carId, userId);

        Map<YearMonth, BigDecimal> fuelMap = new TreeMap<>();
        for (FuelLog l : logs) {
            YearMonth ym = YearMonth.from(java.time.LocalDate.parse(l.getFuelDate()));
            fuelMap.merge(ym, l.getAmount(), BigDecimal::add);
        }
        Map<YearMonth, BigDecimal> maintMap = new TreeMap<>();
        for (MaintenanceLog m : maint) {
            YearMonth ym = YearMonth.from(java.time.LocalDate.parse(m.getServiceDate()));
            maintMap.merge(ym, m.getCost(), BigDecimal::add);
        }

        List<Map<String, Object>> out = new ArrayList<>();
        for (YearMonth ym : MaintenanceCalculator.recentMonths(java.time.LocalDate.now(), months)) {
            Map<String, Object> item = new java.util.LinkedHashMap<>();
            item.put("ym", ym.toString());
            item.put("label", ym.getMonthValue() + "月");
            item.put("fuel", fuelMap.getOrDefault(ym, BigDecimal.ZERO));
            item.put("maintenance", maintMap.getOrDefault(ym, BigDecimal.ZERO));
            item.put("total", fuelMap.getOrDefault(ym, BigDecimal.ZERO)
                    .add(maintMap.getOrDefault(ym, BigDecimal.ZERO)));
            out.add(item);
        }
        return out;
    }
}
