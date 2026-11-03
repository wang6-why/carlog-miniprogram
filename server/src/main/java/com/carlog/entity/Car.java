package com.carlog.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableLogic;
import com.baomidou.mybatisplus.annotation.TableName;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@TableName("car")
public class Car {

    @TableId(type = IdType.ASSIGN_ID)
    private Long id;

    private Long userId;
    private String brand;
    private String model;

    /**
     * 年款。字段名和列名统一叫 model_year / modelYear ——
     * YEAR 是 H2 2.x 的保留字，用它当属性名 MyBatis-Plus 会生成
     * "model_year AS year" 这种带保留字别名的非法 SQL。
     * 属性名与列名驼峰对应后，MP 不再生成 AS 别名，H2 和 MySQL 都能跑。
     */
    private Integer modelYear;
    private String plate;
    private String fuelType;
    private BigDecimal tankCapacity;
    private String color;

    /** 当前总里程，随加油记录自动同步为最大值 */
    private Integer odometer;

    /** 日期统一用字符串存取，避免 LocalDate 在 H2/MySQL 与时区上的行为差异 */
    private String purchaseDate;
    private String insuranceExpiry;
    private String inspectionExpiry;

    private LocalDateTime createTime;
    private LocalDateTime updateTime;

    @TableLogic
    private Integer deleted;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }

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

    public LocalDateTime getCreateTime() { return createTime; }
    public void setCreateTime(LocalDateTime createTime) { this.createTime = createTime; }

    public LocalDateTime getUpdateTime() { return updateTime; }
    public void setUpdateTime(LocalDateTime updateTime) { this.updateTime = updateTime; }

    public Integer getDeleted() { return deleted; }
    public void setDeleted(Integer deleted) { this.deleted = deleted; }
}
