package com.carlog.controller;

import java.util.List;
import java.util.Map;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.carlog.common.R;
import com.carlog.common.UserContext;
import com.carlog.dto.DashboardVO;
import com.carlog.service.DashboardService;

@RestController
@RequestMapping("/dashboard")
public class DashboardController {

    private final DashboardService service;

    public DashboardController(DashboardService service) {
        this.service = service;
    }

    /** 首页总览：一个请求拿全部数字 */
    @GetMapping("/overview/{carId}")
    public R<DashboardVO> overview(@PathVariable Long carId) {
        return R.ok(service.overview(carId, UserContext.require()));
    }

    /** 近 N 个月油费与保养花费，默认 6 个月 */
    @GetMapping("/monthly/{carId}")
    public R<List<Map<String, Object>>> monthly(@PathVariable Long carId,
                                                @RequestParam(defaultValue = "6") int months) {
        int safe = Math.max(1, Math.min(24, months));
        return R.ok(service.monthly(carId, UserContext.require(), safe));
    }
}
