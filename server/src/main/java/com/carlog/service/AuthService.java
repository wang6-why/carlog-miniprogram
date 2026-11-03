package com.carlog.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.carlog.common.BizException;
import com.carlog.dto.AuthRequest;
import com.carlog.dto.LoginResponse;
import com.carlog.entity.User;
import com.carlog.mapper.UserMapper;
import com.carlog.security.JwtUtil;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
public class AuthService {

    private final UserMapper userMapper;
    private final JwtUtil jwtUtil;
    private final BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();

    public AuthService(UserMapper userMapper, JwtUtil jwtUtil) {
        this.userMapper = userMapper;
        this.jwtUtil = jwtUtil;
    }

    @Transactional
    public LoginResponse register(AuthRequest req) {
        LambdaQueryWrapper<User> q = Wrappers.lambdaQuery(User.class)
                .eq(User::getUsername, req.getUsername());
        if (userMapper.selectCount(q) > 0) {
            throw new BizException("用户名已被占用");
        }

        User user = new User();
        user.setUsername(req.getUsername());
        user.setPassword(encoder.encode(req.getPassword()));
        user.setNickname(req.getNickname() == null || req.getNickname().isBlank()
                ? req.getUsername() : req.getNickname());
        user.setRole("USER");
        user.setCreateTime(LocalDateTime.now());
        user.setUpdateTime(LocalDateTime.now());
        user.setDeleted(0);
        userMapper.insert(user);

        return buildResponse(user);
    }

    public LoginResponse login(AuthRequest req) {
        User user = userMapper.selectOne(Wrappers.lambdaQuery(User.class)
                .eq(User::getUsername, req.getUsername()));

        // 用户名不存在与密码错误返回同一句提示，避免被枚举出哪些账号存在
        if (user == null || !encoder.matches(req.getPassword(), user.getPassword())) {
            throw new BizException(401, "用户名或密码错误");
        }
        return buildResponse(user);
    }

    public User currentUser(Long userId) {
        User user = userMapper.selectById(userId);
        if (user == null) {
            throw BizException.notFound("用户");
        }
        return user;
    }

    private LoginResponse buildResponse(User user) {
        String token = jwtUtil.generate(user.getId(), user.getUsername(), user.getRole());
        return new LoginResponse(token, user.getId(), user.getUsername(),
                user.getNickname(), user.getRole(), jwtUtil.getExpireSeconds());
    }
}
