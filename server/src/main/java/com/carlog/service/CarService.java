package com.carlog.service;

import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.carlog.common.BizException;
import com.carlog.dto.CarRequest;
import com.carlog.entity.Car;
import com.carlog.entity.FuelLog;
import com.carlog.mapper.CarMapper;
import com.carlog.mapper.FuelLogMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Objects;

@Service
public class CarService {

    private final CarMapper carMapper;
    private final FuelLogMapper fuelLogMapper;

    public CarService(CarMapper carMapper, FuelLogMapper fuelLogMapper) {
        this.carMapper = carMapper;
        this.fuelLogMapper = fuelLogMapper;
    }

    public List<Car> list(Long userId) {
        return carMapper.selectList(Wrappers.lambdaQuery(Car.class)
                .eq(Car::getUserId, userId)
                .orderByAsc(Car::getCreateTime));
    }

    /** 取车并校验归属，越权一律按「不存在」处理，不泄露他人数据是否存在 */
    public Car requireOwned(Long carId, Long userId) {
        Car car = carMapper.selectById(carId);
        if (car == null || !Objects.equals(car.getUserId(), userId)) {
            throw BizException.notFound("车辆");
        }
        return car;
    }

    @Transactional
    public Car create(CarRequest req, Long userId) {
        Car car = new Car();
        car.setUserId(userId);
        apply(car, req);
        car.setCreateTime(LocalDateTime.now());
        car.setUpdateTime(LocalDateTime.now());
        car.setDeleted(0);
        carMapper.insert(car);
        return car;
    }

    @Transactional
    public Car update(Long carId, CarRequest req, Long userId) {
        Car car = requireOwned(carId, userId);
        apply(car, req);
        car.setUpdateTime(LocalDateTime.now());
        carMapper.updateById(car);
        return car;
    }

    /**
     * 删除车辆
     *
     * 留着加油与保养记录会成为孤儿数据，统计时算到不存在的车上。
     * 所以在同一事务里把关联记录一起逻辑删除。
     */
    @Transactional
    public void remove(Long carId, Long userId) {
        requireOwned(carId, userId);
        carMapper.deleteById(carId);
        // MyBatis-Plus 的逻辑删除会把这些记录标记 deleted=1，而不是真删
        fuelLogMapper.delete(Wrappers.lambdaQuery(FuelLog.class).eq(FuelLog::getCarId, carId));
    }

    /** 加油后把车辆里程同步到最大记录里程 */
    @Transactional
    public void syncOdometer(Long carId, int mileage) {
        Car car = carMapper.selectById(carId);
        if (car != null && (car.getOdometer() == null || mileage > car.getOdometer())) {
            car.setOdometer(mileage);
            car.setUpdateTime(LocalDateTime.now());
            carMapper.updateById(car);
        }
    }

    private void apply(Car car, CarRequest req) {
        car.setBrand(req.getBrand());
        car.setModel(req.getModel());
        car.setModelYear(req.getModelYear());
        car.setPlate(req.getPlate());
        car.setFuelType(req.getFuelType());
        car.setTankCapacity(req.getTankCapacity());
        car.setColor(req.getColor() == null ? "#00D4FF" : req.getColor());
        car.setOdometer(req.getOdometer() == null ? 0 : req.getOdometer());
        car.setPurchaseDate(req.getPurchaseDate());
        car.setInsuranceExpiry(req.getInsuranceExpiry());
        car.setInspectionExpiry(req.getInspectionExpiry());
    }
}
