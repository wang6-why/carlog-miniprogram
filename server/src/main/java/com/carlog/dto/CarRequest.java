package com.carlog.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

/** 车辆新增 / 编辑请求 */
public class CarRequest {

    private Long id;

    @NotBlank(message = "请填写品牌")
    @Size(max = 32, message = "品牌最多 32 字")
    private String brand;

    @NotBlank(message = "请填写车型")
    @Size(max = 64, message = "车型最多 64 字")
    private String model;

    @Min(value = 1950, message = "年份不合理")
    @Max(value = 2100, message = "年份不合理")
    private Integer modelYear;

    private String plate;

    private String fuelType;

    private BigDecimal tankCapacity;

    private String color;

    @Min(value = 0, message = "里程不能为负")
    private Integer odometer;

    @Pattern(regexp = "^$|^\\d{4}-\\d{2}-\\d{2}$", message = "日期格式应为 yyyy-MM-dd")
    private String purchaseDate;

    @Pattern(regexp = "^$|^\\d{4}-\\d{2}-\\d{2}$", message = "日期格式应为 yyyy-MM-dd")
    private String insuranceExpiry;

    @Pattern(regexp = "^$|^\\d{4}-\\d{2}-\\d{2}$", message = "日期格式应为 yyyy-MM-dd")
    private String inspectionExpiry;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getBrand() { return brand; }
    public void setBrand(String brand) { this.brand = brand; }

    public String getModel() { return model; }
    public void setModel(String model) { this.model = model; }

    public Integer getModelYear() { return modelYear; }
    public void setModelYear(Integer modelYear) { this.modelYear = modelYear; }

    public String getPlate() { return plate; }
    public void setPlate(String plate) { this.plate = plate; }

    public String getFuelType() { return fuelType; }
    public void setFuelType(String fuelType) { this.fuelType = fuelType; }

    public BigDecimal getTankCapacity() { return tankCapacity; }
    public void setTankCapacity(BigDecimal tankCapacity) { this.tankCapacity = tankCapacity; }

    public String getColor() { return color; }
    public void setColor(String color) { this.color = color; }

    public Integer getOdometer() { return odometer; }
    public void setOdometer(Integer odometer) { this.odometer = odometer; }

    public String getPurchaseDate() { return purchaseDate; }
    public void setPurchaseDate(String purchaseDate) { this.purchaseDate = purchaseDate; }

    public String getInsuranceExpiry() { return insuranceExpiry; }
    public void setInsuranceExpiry(String insuranceExpiry) { this.insuranceExpiry = insuranceExpiry; }

    public String getInspectionExpiry() { return inspectionExpiry; }
    public void setInspectionExpiry(String inspectionExpiry) { this.inspectionExpiry = inspectionExpiry; }
}
