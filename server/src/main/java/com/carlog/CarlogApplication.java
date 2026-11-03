package com.carlog;

import org.mybatis.spring.annotation.MapperScan;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * 车迹 · 养车记账 服务端
 *
 * 单人项目刻意保持单体：一个进程 + 一张库就能把「认证 → 业务 → 统计」跑通。
 * 拆微服务在这里只会让部署和面试解释都变复杂。
 */
@SpringBootApplication
@MapperScan("com.carlog.mapper")
public class CarlogApplication {

    public static void main(String[] args) {
        SpringApplication.run(CarlogApplication.class, args);
    }
}
