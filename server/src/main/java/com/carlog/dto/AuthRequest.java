package com.carlog.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** 登录 / 注册请求 */
public class AuthRequest {

    @NotBlank(message = "请输入用户名")
    @Size(min = 3, max = 32, message = "用户名需 3-32 位")
    private String username;

    @NotBlank(message = "请输入密码")
    @Size(min = 6, max = 32, message = "密码需 6-32 位")
    private String password;

    /** 注册时可填，不填默认用用户名 */
    private String nickname;

    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }

    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }

    public String getNickname() { return nickname; }
    public void setNickname(String nickname) { this.nickname = nickname; }
}
