package com.carlog.dto;

/**
 * 登录成功返回
 * 不含 password 字段——实体永远不要直接返回给前端。
 */
public class LoginResponse {

    private String token;
    private Long userId;
    private String username;
    private String nickname;
    private String role;
    private long expiresIn;

    public LoginResponse(String token, Long userId, String username, String nickname,
                         String role, long expiresIn) {
        this.token = token;
        this.userId = userId;
        this.username = username;
        this.nickname = nickname;
        this.role = role;
        this.expiresIn = expiresIn;
    }

    public String getToken() { return token; }
    public Long getUserId() { return userId; }
    public String getUsername() { return username; }
    public String getNickname() { return nickname; }
    public String getRole() { return role; }
    public long getExpiresIn() { return expiresIn; }
}
