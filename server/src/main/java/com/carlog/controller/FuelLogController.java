package com.carlog.controller;

import com.carlog.common.R;
import com.carlog.common.UserContext;
import com.carlog.dto.FuelLogRequest;
import com.carlog.entity.FuelLog;
import com.carlog.service.FuelLogService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/fuel-logs")
public class FuelLogController {

    private final FuelLogService service;

    public FuelLogController(FuelLogService service) {
        this.service = service;
    }

    /** carId 可选：不传返回当前用户全部加油记录 */
    @GetMapping
    public R<List<FuelLog>> list(@RequestParam(required = false) Long carId) {
        Long userId = UserContext.require();
        return R.ok(carId == null ? service.listAll(userId) : service.listByCar(carId, userId));
    }

    @PostMapping
    public R<FuelLog> create(@Valid @RequestBody FuelLogRequest req) {
        return R.ok(service.create(req, UserContext.require()));
    }

    @PutMapping("/{id}")
    public R<FuelLog> update(@PathVariable Long id, @Valid @RequestBody FuelLogRequest req) {
        return R.ok(service.update(id, req, UserContext.require()));
    }

    @DeleteMapping("/{id}")
    public R<Void> remove(@PathVariable Long id) {
        service.remove(id, UserContext.require());
        return R.ok();
    }
}
