package com.carlog.service;

import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.carlog.dto.FuelLogRequest;
import com.carlog.entity.Car;
import com.carlog.entity.FuelLog;
import com.carlog.mapper.FuelLogMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Comparator;
import java.util.List;

import com.carlog.common.BizException;

@Service
public class FuelLogService {

    private static final DateTimeFormatter FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd");

    private final FuelLogMapper fuelLogMapper;
    private final CarService carService;

    public FuelLogService(FuelLogMapper fuelLogMapper, CarService carService) {
        this.fuelLogMapper = fuelLogMapper;
        this.carService = carService;
    }

    /** 按里程升序，油耗计算依赖顺序 */
    public List<FuelLog> listByCar(Long carId, Long userId) {
        carService.requireOwned(carId, userId);
        return fuelLogMapper.selectList(Wrappers.lambdaQuery(FuelLog.class)
                .eq(FuelLog::getCarId, carId)
                .orderByAsc(FuelLog::getMileage)
                .orderByAsc(FuelLog::getFuelDate));
    }

    public List<FuelLog> listAll(Long userId) {
        return fuelLogMapper.selectList(Wrappers.lambdaQuery(FuelLog.class)
                .eq(FuelLog::getUserId, userId)
                .orderByDesc(FuelLog::getFuelDate));
    }

    @Transactional
    public FuelLog create(FuelLogRequest req, Long userId) {
        Long carId = requireCarId(req, null);
        validateMileage(req.getMileage(), carId, null);

        FuelLog log = new FuelLog();
        log.setUserId(userId);
        log.setCarId(carId);
        apply(log, req);
        log.setCreateTime(LocalDateTime.now());
        log.setUpdateTime(LocalDateTime.now());
        log.setDeleted(0);
        fuelLogMapper.insert(log);

        carService.syncOdometer(carId, req.getMileage());
        return log;
    }

    @Transactional
    public FuelLog update(Long id, FuelLogRequest req, Long userId) {
        FuelLog exist = requireOwned(id, userId);
        Long carId = req.getCarId() == null ? exist.getCarId() : req.getCarId();
        carService.requireOwned(carId, userId);
        validateMileage(req.getMileage(), carId, id);

        exist.setCarId(carId);
        apply(exist, req);
        exist.setUpdateTime(LocalDateTime.now());
        fuelLogMapper.updateById(exist);

        carService.syncOdometer(carId, req.getMileage());
        return exist;
    }

    @Transactional
    public void remove(Long id, Long userId) {
        requireOwned(id, userId);
        fuelLogMapper.deleteById(id);
    }

    public FuelLog requireOwned(Long id, Long userId) {
        FuelLog log = fuelLogMapper.selectById(id);
        if (log == null || !log.getUserId().equals(userId)) {
            throw BizException.notFound("加油记录");
        }
        return log;
    }

    /**
     * 里程不能小于同车已有记录的最大里程
     *
     * 为什么拦：里程回退会让「两次加满之间」的里程差变负，油耗算出来是负数。
     * 但补录历史记录是合法场景，所以比较基准取「除自己以外的最大值」，
     * 允许插入比当前车况里程小的历史行——只要它比更早的记录大。
     */
    private void validateMileage(int mileage, Long carId, Long selfId) {
        List<FuelLog> rows = fuelLogMapper.selectList(Wrappers.lambdaQuery(FuelLog.class)
                .eq(FuelLog::getCarId, carId));
        int max = rows.stream()
                .filter(r -> selfId == null || !selfId.equals(r.getId()))
                .map(FuelLog::getMileage)
                .max(Comparator.naturalOrder())
                .orElse(0);
        if (mileage < max) {
            throw new BizException("里程不能小于已有记录的最大里程 " + max + "km");
        }
    }

    private Long requireCarId(FuelLogRequest req, Long fallback) {
        Long carId = req.getCarId() == null ? fallback : req.getCarId();
        if (carId == null) {
            throw new BizException("请选择车辆");
        }
        return carId;
    }

    private void apply(FuelLog log, FuelLogRequest req) {
        log.setMileage(req.getMileage());
        log.setLiters(req.getLiters());
        log.setPrice(req.getPrice());
        // 金额允许与 liters×price 略有差异（加油站抹零），没传才补算
        log.setAmount(req.getAmount() != null ? req.getAmount()
                : req.getLiters().multiply(req.getPrice()).setScale(2, java.math.RoundingMode.HALF_UP));
        log.setIsFull(req.getIsFull() != null && req.getIsFull());
        log.setStation(req.getStation());
        log.setNote(req.getNote());
        log.setFuelDate(req.getFuelDate() == null || req.getFuelDate().isBlank()
                ? LocalDate.now().format(FMT) : req.getFuelDate());
    }
}
