package com.carlog.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;

/**
 * JWT 工具
 *
 * 用 jjwt 0.12.x 的 API（与满网的 0.9.x 教程差异很大）：
 *   - 不再有 setSubject/setExpiration 这种链式写法，改为 claims().subject().expiration()
 *   - 签名用 SecretKey 对象，不再塞字符串 + 算法名
 * key 长度必须 >= 256 bit，否则 HS256 会直接抛 WeakKeyException。
 */
@Component
public class JwtUtil {

    private final SecretKey key;
    private final long expireSeconds;

    public JwtUtil(@Value("${carlog.jwt.secret}") String secret,
                   @Value("${carlog.jwt.expire-seconds}") long expireSeconds) {
        this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.expireSeconds = expireSeconds;
    }

    public String generate(Long userId, String username, String role) {
        Date now = new Date();
        Date exp = new Date(now.getTime() + expireSeconds * 1000);
        return Jwts.builder()
                .subject(String.valueOf(userId))
                .claim("username", username)
                .claim("role", role)
                .issuedAt(now)
                .expiration(exp)
                .signWith(key)
                .compact();
    }

    /** 只取 userId，其余 claims 业务层用不到就不要再解一次 */
    public Long parseUserId(String token) {
        Claims claims = Jwts.parser()
                .verifyWith(key)
                .build()
                .parseSignedClaims(token)
                .getPayload();
        try {
            return Long.valueOf(claims.getSubject());
        } catch (NumberFormatException e) {
            throw new JwtException("token 载荷异常");
        }
    }

    public long getExpireSeconds() {
        return expireSeconds;
    }
}
