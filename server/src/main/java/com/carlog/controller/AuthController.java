package com.carlog.controller;

import com.carlog.common.R;
import com.carlog.common.UserContext;
import com.carlog.dto.AuthRequest;
import com.carlog.dto.LoginResponse;
import com.carlog.entity.User;
import com.carlog.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/register")
    public R<LoginResponse> register(@Valid @RequestBody AuthRequest req) {
        return R.ok(authService.register(req));
    }

    @PostMapping("/login")
    public R<LoginResponse> login(@Valid @RequestBody AuthRequest req) {
        return R.ok(authService.login(req));
    }

    /** 当前用户信息，用于 Vue 后台刷新页面后恢复登录态 */
    @GetMapping("/me")
    public R<Map<String, Object>> me() {
        User user = authService.currentUser(UserContext.require());
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("userId", user.getId());
        data.put("username", user.getUsername());
        data.put("nickname", user.getNickname());
        data.put("role", user.getRole());
        return R.ok(data);
    }
}
