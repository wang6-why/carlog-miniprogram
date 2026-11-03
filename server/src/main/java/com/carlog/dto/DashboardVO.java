package com.carlog.dto;

import java.math.BigDecimal;
import java.util.List;

import com.carlog.service.MaintenanceCalculator;

/**
 * 仪表盘总览
 *
 * 一次请求返回首页需要的全部数字，避免小程序发 4-5 个请求排队等回包。
 */
public class DashboardVO {

    private Long carId;
    private String carName;
    private String plate;
    private String color;
    private Integer odometer;

    /** 最近油耗 L/100km，null 表示记录不足两次加满 */
    private BigDecimal latestConsumption;
    /** 加权平均油耗 */
    private BigDecimal avgConsumption;
    /** 与上次的差值，正数更费油 */
    private BigDecimal trend;

    private BigDecimal monthSpend;
    private BigDecimal totalAmount;
    private Integer recordCount;
    private Integer totalKm;
    private BigDecimal costPerKm;

    /** 超期 / 即将到期的保养项 */
    private List<MaintenanceCalculator.Status> alerts;

    public Long getCarId() { return carId; }
    public void setCarId(Long carId) { this.carId = carId; }

    public String getCarName() { return carName; }
    public void setCarName(String carName) { this.carName = carName; }

    public String getPlate() { return plate; }
    public void setPlate(String plate) { this.plate = plate; }

    public String getColor() { return color; }
    public void setColor(String color) { this.color = color; }

    public Integer getOdometer() { return odometer; }
    public void setOdometer(Integer odometer) { this.odometer = odometer; }

    public BigDecimal getLatestConsumption() { return latestConsumption; }
    public void setLatestConsumption(BigDecimal latestConsumption) { this.latestConsumption = latestConsumption; }

    public BigDecimal getAvgConsumption() { return avgConsumption; }
    public void setAvgConsumption(BigDecimal avgConsumption) { this.avgConsumption = avgConsumption; }

    public BigDecimal getTrend() { return trend; }
    public void setTrend(BigDecimal trend) { this.trend = trend; }

    public BigDecimal getMonthSpend() { return monthSpend; }
    public void setMonthSpend(BigDecimal monthSpend) { this.monthSpend = monthSpend; }

    public BigDecimal getTotalAmount() { return totalAmount; }
    public void setTotalAmount(BigDecimal totalAmount) { this.totalAmount = totalAmount; }

    public Integer getRecordCount() { return recordCount; }
    public void setRecordCount(Integer recordCount) { this.recordCount = recordCount; }

    public Integer getTotalKm() { return totalKm; }
    public void setTotalKm(Integer totalKm) { this.totalKm = totalKm; }

    public BigDecimal getCostPerKm() { return costPerKm; }
    public void setCostPerKm(BigDecimal costPerKm) { this.costPerKm = costPerKm; }

    public List<MaintenanceCalculator.Status> getAlerts() { return alerts; }
    public void setAlerts(List<MaintenanceCalculator.Status> alerts) { this.alerts = alerts; }
}
