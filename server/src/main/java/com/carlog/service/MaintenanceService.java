package com.carlog.service;

import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.carlog.common.BizException;
import com.carlog.dto.MaintenanceLogRequest;
import com.carlog.entity.Car;
import com.carlog.entity.MaintenanceLog;
import com.carlog.enums.MaintenanceTemplate;
import com.carlog.mapper.MaintenanceLogMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class MaintenanceService {

    private static final DateTimeFormatter FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd");

    private final MaintenanceLogMapper mapper;
    private final CarService carService;

    public MaintenanceService(MaintenanceLogMapper mapper, CarService carService) {
        this.mapper = mapper;
        this.carService = carService;
    }

    public List<MaintenanceLog> listByCar(Long carId, Long userId) {
        carService.requireOwned(carId, userId);
        return mapper.selectList(Wrappers.lambdaQuery(MaintenanceLog.class)
                .eq(MaintenanceLog::getCarId, carId)
                .orderByDesc(MaintenanceLog::getServiceDate));
    }

    public List<MaintenanceLog> listAll(Long userId) {
        return mapper.selectList(Wrappers.lambdaQuery(MaintenanceLog.class)
                .eq(MaintenanceLog::getUserId, userId)
                .orderByDesc(MaintenanceLog::getServiceDate));
    }

    /**
     * 保养看板：8 个项目全摊开
     *
     * 每个项目取「最近一次记录」，交给 MaintenanceCalculator 推下次到期。
     * 结果按 severity 排序，超期项永远在最前。
     */
    public List<MaintenanceCalculator.Status> board(Long carId, Long userId) {
        Car car = carService.requireOwned(carId, userId);
        List<MaintenanceLog> logs = listByCar(carId, userId);

        Map<String, MaintenanceLog> latest = new HashMap<>();
        for (MaintenanceLog log : logs) {
            MaintenanceLog cur = latest.get(log.getItemKey());
            if (cur == null || log.getServiceDate().compareTo(cur.getServiceDate()) > 0) {
                latest.put(log.getItemKey(), log);
            }
        }

        LocalDate today = LocalDate.now();
        int odometer = car.getOdometer() == null ? 0 : car.getOdometer();

        List<MaintenanceCalculator.Status> list = new ArrayList<>();
        for (MaintenanceTemplate tpl : MaintenanceTemplate.values()) {
            MaintenanceLog last = latest.get(tpl.getKey());
            list.add(MaintenanceCalculator.calc(
                    tpl,
                    last == null ? null : LocalDate.parse(last.getServiceDate()),
                    last == null ? null : last.getMileage(),
                    odometer,
                    today));
        }

        list.sort(Comparator
                .comparingInt((MaintenanceCalculator.Status s) -> MaintenanceCalculator.severity(s.status()))
                .thenComparing(MaintenanceCalculator.Status::key));
        return list;
    }

    /** 已超期 + 即将到期，首页提醒卡用 */
    public List<MaintenanceCalculator.Status> alerts(Long carId, Long userId) {
        return board(carId, userId).stream()
                .filter(s -> "overdue".equals(s.status()) || "soon".equals(s.status()))
                .toList();
    }

    @Transactional
    public MaintenanceLog create(MaintenanceLogRequest req, Long userId) {
        if (req.getCarId() == null) {
            throw new BizException("请选择车辆");
        }
        carService.requireOwned(req.getCarId(), userId);

        MaintenanceTemplate tpl = MaintenanceTemplate.of(req.getItemKey());
        if (tpl == null) {
            throw new BizException("未知的保养项目: " + req.getItemKey());
        }

        MaintenanceLog log = new MaintenanceLog();
        log.setUserId(userId);
        log.setCarId(req.getCarId());
        fill(log, req, tpl);
        log.setCreateTime(LocalDateTime.now());
        log.setUpdateTime(LocalDateTime.now());
        log.setDeleted(0);
        mapper.insert(log);
        return log;
    }

    @Transactional
    public MaintenanceLog update(Long id, MaintenanceLogRequest req, Long userId) {
        MaintenanceLog exist = requireOwned(id, userId);
        MaintenanceTemplate tpl = MaintenanceTemplate.of(req.getItemKey());
        if (tpl == null) {
            throw new BizException("未知的保养项目: " + req.getItemKey());
        }
        fill(exist, req, tpl);
        exist.setUpdateTime(LocalDateTime.now());
        mapper.updateById(exist);
        return exist;
    }

    @Transactional
    public void remove(Long id, Long userId) {
        requireOwned(id, userId);
        mapper.deleteById(id);
    }

    public MaintenanceLog requireOwned(Long id, Long userId) {
        MaintenanceLog log = mapper.selectById(id);
        if (log == null || !log.getUserId().equals(userId)) {
            throw BizException.notFound("保养记录");
        }
        return log;
    }

    /** 项目名与图标一律以模板为准，避免前端传错导致看板显示错乱 */
    private void fill(MaintenanceLog log, MaintenanceLogRequest req, MaintenanceTemplate tpl) {
        log.setItemKey(tpl.getKey());
        log.setItemName(tpl.getName());
        log.setIcon(tpl.getIcon());
        log.setMileage(req.getMileage());
        log.setCost(req.getCost() == null ? BigDecimal.ZERO : req.getCost());
        log.setShop(req.getShop());
        log.setNote(req.getNote());
        log.setServiceDate(req.getServiceDate() == null || req.getServiceDate().isBlank()
                ? LocalDate.now().format(FMT) : req.getServiceDate());
    }
}
