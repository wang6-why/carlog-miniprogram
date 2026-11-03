package com.carlog.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

import java.math.BigDecimal;

/**
 * 加油记录请求
 *
 * 校验放在 DTO 上而不是 Service 里：
 * Bean Validation 失败会自动被 GlobalExceptionHandler 转成 422 + 中文提示，
 * Service 只处理「跨记录的业务规则」（比如里程不能小于历史最大里程）。
 */
public class FuelLogRequest {

    /** 编辑时必填，新增时留空 */
    private Long id;

    private Long carId;

    @NotNull(message = "请填写当前里程")
    @Min(value = 1, message = "里程必须大于 0")
    @Max(value = 3_000_000, message = "里程数值不合理")
    private Integer mileage;

    @NotNull(message = "请填写加油升数")
    @DecimalMin(value = "0.01", message = "加油升数必须大于 0")
    @DecimalMax(value = "200", message = "加油量超过 200L，请检查是否填错")
    private BigDecimal liters;

    @NotNull(message = "请填写油价")
    @DecimalMin(value = "0.01", message = "油价必须大于 0")
    @DecimalMax(value = "20", message = "油价超过 20 元/L，请检查是否填错")
    private BigDecimal price;

    /** 允许不传，服务端按 liters × price 补算 */
    private BigDecimal amount;

    private Boolean isFull;

    private String station;

    private String note;

    @Pattern(regexp = "^\\d{4}-\\d{2}-\\d{2}$", message = "日期格式应为 yyyy-MM-dd")
    private String fuelDate;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getCarId() { return carId; }
    public void setCarId(Long carId) { this.carId = carId; }

    public Integer getMileage() { return mileage; }
    public void setMileage(Integer mileage) { this.mileage = mileage; }

    public BigDecimal getLiters() { return liters; }
    public void setLiters(BigDecimal liters) { this.liters = liters; }

    public BigDecimal getPrice() { return price; }
    public void setPrice(BigDecimal price) { this.price = price; }

    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }

    public Boolean getIsFull() { return isFull; }
    public void setIsFull(Boolean isFull) { this.isFull = isFull; }

    public String getStation() { return station; }
    public void setStation(String station) { this.station = station; }

    public String getNote() { return note; }
    public void setNote(String note) { this.note = note; }

    public String getFuelDate() { return fuelDate; }
    public void setFuelDate(String fuelDate) { this.fuelDate = fuelDate; }
}
