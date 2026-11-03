package com.carlog.controller;

import com.carlog.common.R;
import com.carlog.common.UserContext;
import com.carlog.dto.CarRequest;
import com.carlog.entity.Car;
import com.carlog.service.CarService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/cars")
public class CarController {

    private final CarService carService;

    public CarController(CarService carService) {
        this.carService = carService;
    }

    @GetMapping
    public R<List<Car>> list() {
        return R.ok(carService.list(UserContext.require()));
    }

    @GetMapping("/{id}")
    public R<Car> detail(@PathVariable Long id) {
        return R.ok(carService.requireOwned(id, UserContext.require()));
    }

    @PostMapping
    public R<Car> create(@Valid @RequestBody CarRequest req) {
        return R.ok(carService.create(req, UserContext.require()));
    }

    @PutMapping("/{id}")
    public R<Car> update(@PathVariable Long id, @Valid @RequestBody CarRequest req) {
        return R.ok(carService.update(id, req, UserContext.require()));
    }

    @DeleteMapping("/{id}")
    public R<Void> remove(@PathVariable Long id) {
        carService.remove(id, UserContext.require());
        return R.ok();
    }
}
