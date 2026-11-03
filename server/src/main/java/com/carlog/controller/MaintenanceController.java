package com.carlog.controller;

import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.carlog.common.R;
import com.carlog.common.UserContext;
import com.carlog.dto.MaintenanceLogRequest;
import com.carlog.entity.MaintenanceLog;
import com.carlog.enums.MaintenanceTemplate;
import com.carlog.service.MaintenanceCalculator;
import com.carlog.service.MaintenanceService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/maintenance")
public class MaintenanceController {

    private final MaintenanceService service;

    public MaintenanceController(MaintenanceService service) {
        this.service = service;
    }

    /** 周期模板，前端下拉用 */
    @GetMapping("/templates")
    public R<List<Map<String, Object>>> templates() {
        List<Map<String, Object>> list = Arrays.stream(MaintenanceTemplate.values())
                .map(t -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("key", t.getKey());
                    m.put("name", t.getName());
                    m.put("icon", t.getIcon());
                    m.put("kmCycle", t.getKmCycle());
                    m.put("monthCycle", t.getMonthCycle());
                    m.put("desc", t.getDesc());
                    return m;
                })
                .toList();
        return R.ok(list);
    }

    @GetMapping("/logs")
    public R<List<MaintenanceLog>> logs(@RequestParam(required = false) Long carId) {
        Long userId = UserContext.require();
        return R.ok(carId == null ? service.listAll(userId) : service.listByCar(carId, userId));
    }

    /** 保养看板：8 个项目 + 剩余里程/天数 + 状态 */
    @GetMapping("/board")
    public R<List<MaintenanceCalculator.Status>> board(@RequestParam Long carId) {
        return R.ok(service.board(carId, UserContext.require()));
    }

    @GetMapping("/alerts")
    public R<List<MaintenanceCalculator.Status>> alerts(@RequestParam Long carId) {
        return R.ok(service.alerts(carId, UserContext.require()));
    }

    @PostMapping("/logs")
    public R<MaintenanceLog> create(@Valid @RequestBody MaintenanceLogRequest req) {
        return R.ok(service.create(req, UserContext.require()));
    }

    @PutMapping("/logs/{id}")
    public R<MaintenanceLog> update(@PathVariable Long id,
                                    @Valid @RequestBody MaintenanceLogRequest req) {
        return R.ok(service.update(id, req, UserContext.require()));
    }

    @DeleteMapping("/logs/{id}")
    public R<Void> remove(@PathVariable Long id) {
        service.remove(id, UserContext.require());
        return R.ok();
    }
}
