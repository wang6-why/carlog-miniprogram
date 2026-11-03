package com.carlog.config;

import com.carlog.common.BizException;
import com.carlog.common.R;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.carlog.security.JwtUtil;
import com.carlog.common.UserContext;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.core.env.Environment;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import java.util.Arrays;
import java.util.List;

/**
 * JWT 鉴权拦截器
 *
 * 为什么不用 Spring Security 过滤链：
 *   这个项目要的只是「解析 token → 塞 userId 到上下文 → 401 拦截」，
 *   引入整套 Security 反而要多写一大堆配置类，面试时还容易讲不清。
 *   只引 spring-security-crypto 拿 BCrypt 足矣。
 *
 * 白名单：登录、注册、文档、H2 控制台、健康检查
 */
@Component
public class AuthInterceptor implements HandlerInterceptor {

    private static final List<String> WHITE_LIST = Arrays.asList(
            "/auth/login",
            "/auth/register",
            "/doc.html",
            "/v3/api-docs",
            "/swagger-ui",
            "/h2-console"
    );

    private final JwtUtil jwtUtil;
    private final ObjectMapper objectMapper;
    private final Environment env;

    public AuthInterceptor(JwtUtil jwtUtil, ObjectMapper objectMapper, Environment env) {
        this.jwtUtil = jwtUtil;
        this.objectMapper = objectMapper;
        this.env = env;
    }

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler)
            throws Exception {

        String uri = request.getRequestURI();

        // context-path 是 /api，这里比较时要去掉，否则白名单永远匹配不上
        String path = uri.replace(request.getContextPath(), "");

        // OPTIONS 预检直接放行，否则跨域请求会被拦在网上
        if ("OPTIONS".equalsIgnoreCase(request.getMethod())) {
            return true;
        }

        if (WHITE_LIST.stream().anyMatch(path::startsWith)) {
            return true;
        }

        String header = request.getHeader("Authorization");
        if (header == null || !header.startsWith("Bearer ")) {
            writeUnauthorized(response, "未登录或登录已过期");
            return false;
        }

        try {
            Long userId = jwtUtil.parseUserId(header.substring(7));
            UserContext.set(userId);
            return true;
        } catch (Exception e) {
            writeUnauthorized(response, "登录状态无效，请重新登录");
            return false;
        }
    }

    @Override
    public void afterCompletion(HttpServletRequest request, HttpServletResponse response,
                                Object handler, Exception ex) {
        // 必须清，线程池复用会导致下一个请求读到上一个用户的 id
        UserContext.clear();
    }

    private void writeUnauthorized(HttpServletResponse response, String msg) throws Exception {
        // 返回真正的 HTTP 401：符合 REST 语义，且微信 wx.request 的 fail 回调能据此触发重新登录。
        // body 里仍然带 code=401，方便前端按业务码统一处理。
        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding("UTF-8");
        response.getWriter().write(objectMapper.writeValueAsString(R.fail(401, msg)));
    }
}
