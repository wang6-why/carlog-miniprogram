package com.carlog.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableLogic;
import com.baomidou.mybatisplus.annotation.TableName;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@TableName("fuel_log")
public class FuelLog {

    @TableId(type = IdType.ASSIGN_ID)
    private Long id;

    private Long userId;
    private Long carId;

    private Integer mileage;
    private BigDecimal liters;
    private BigDecimal price;
    private BigDecimal amount;

    /** 是否加满：只有 true 才能作为油耗区间终点 */
    private Boolean isFull;

    private String station;
    private String note;

    /** yyyy-MM-dd */
    private String fuelDate;

    private LocalDateTime createTime;
    private LocalDateTime updateTime;

    @TableLogic
    private Integer deleted;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }

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

    public LocalDateTime getCreateTime() { return createTime; }
    public void setCreateTime(LocalDateTime createTime) { this.createTime = createTime; }

    public LocalDateTime getUpdateTime() { return updateTime; }
    public void setUpdateTime(LocalDateTime updateTime) { this.updateTime = updateTime; }

    public Integer getDeleted() { return deleted; }
    public void setDeleted(Integer deleted) { this.deleted = deleted; }
}
