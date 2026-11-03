package com.carlog.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

import java.math.BigDecimal;

/** 保养记录请求 */
public class MaintenanceLogRequest {

    private Long id;

    private Long carId;

    @NotBlank(message = "请选择保养项目")
    private String itemKey;

    @NotNull(message = "请填写保养里程")
    @Min(value = 0, message = "里程不能为负")
    @Max(value = 3_000_000, message = "里程数值不合理")
    private Integer mileage;

    @DecimalMin(value = "0", message = "金额不能为负")
    private BigDecimal cost;

    private String shop;

    private String note;

    @Pattern(regexp = "^\\d{4}-\\d{2}-\\d{2}$", message = "日期格式应为 yyyy-MM-dd")
    private String serviceDate;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getCarId() { return carId; }
    public void setCarId(Long carId) { this.carId = carId; }

    public String getItemKey() { return itemKey; }
    public void setItemKey(String itemKey) { this.itemKey = itemKey; }

    public Integer getMileage() { return mileage; }
    public void setMileage(Integer mileage) { this.mileage = mileage; }

    public BigDecimal getCost() { return cost; }
    public void setCost(BigDecimal cost) { this.cost = cost; }

    public String getShop() { return shop; }
    public void setShop(String shop) { this.shop = shop; }

    public String getNote() { return note; }
    public void setNote(String note) { this.note = note; }

    public String getServiceDate() { return serviceDate; }
    public void setServiceDate(String serviceDate) { this.serviceDate = serviceDate; }
}
