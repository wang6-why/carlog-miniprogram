-- ============================================================
-- 车迹 · 养车记账 建表脚本
--
-- 兼容性说明（踩过的坑）：
--   这份脚本要同时跑在 H2(MODE=MySQL) 和 MySQL 8 上。
--   MySQL 的 `COMMENT '...'` 列注释 H2 并不支持，
--   写了会直接 Syntax error，所以这里不写列注释，
--   字段含义统一放在 Java 实体的注释里。
--   同理避免 KEY xxx (...) 内联索引，改为独立的 CREATE INDEX，
--   H2 与 MySQL 8 都认。
--   另外 YEAR 是 H2 2.x 的保留字，年款字段列名用 model_year，
--   实体里通过 @TableField("model_year") 映射。
-- ============================================================

CREATE TABLE IF NOT EXISTS `user` (
  `id`          BIGINT       NOT NULL,
  `username`    VARCHAR(32)  NOT NULL,
  `password`    VARCHAR(72)  NOT NULL,
  `nickname`    VARCHAR(32)  NOT NULL,
  `role`        VARCHAR(16)  NOT NULL DEFAULT 'USER',
  `create_time` TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `update_time` TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted`     TINYINT      NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`)
);

CREATE UNIQUE INDEX IF NOT EXISTS `uk_user_username` ON `user` (`username`);

CREATE TABLE IF NOT EXISTS `car` (
  `id`                 BIGINT       NOT NULL,
  `user_id`            BIGINT       NOT NULL,
  `brand`              VARCHAR(32)  NOT NULL,
  `model`              VARCHAR(64)  NOT NULL,
  `model_year`         INT          NULL,
  `plate`              VARCHAR(16)  NULL,
  `fuel_type`          VARCHAR(16)  NULL,
  `tank_capacity`      DECIMAL(6,1) NULL,
  `color`              VARCHAR(16)  NULL,
  `odometer`           INT          NOT NULL DEFAULT 0,
  `purchase_date`      VARCHAR(10)  NULL,
  `insurance_expiry`   VARCHAR(10)  NULL,
  `inspection_expiry`  VARCHAR(10)  NULL,
  `create_time`        TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `update_time`        TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted`            TINYINT      NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`)
);

CREATE INDEX IF NOT EXISTS `idx_car_user` ON `car` (`user_id`);

CREATE TABLE IF NOT EXISTS `fuel_log` (
  `id`          BIGINT        NOT NULL,
  `user_id`     BIGINT        NOT NULL,
  `car_id`      BIGINT        NOT NULL,
  `mileage`     INT           NOT NULL,
  `liters`      DECIMAL(7,2)  NOT NULL,
  `price`       DECIMAL(6,2)  NOT NULL,
  `amount`      DECIMAL(8,2)  NOT NULL,
  `is_full`     TINYINT       NOT NULL DEFAULT 0,
  `station`     VARCHAR(64)   NULL,
  `note`        VARCHAR(128)  NULL,
  `fuel_date`   VARCHAR(10)   NOT NULL,
  `create_time` TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `update_time` TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted`     TINYINT       NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`)
);

CREATE INDEX IF NOT EXISTS `idx_fuel_car_mileage` ON `fuel_log` (`car_id`, `mileage`);

CREATE TABLE IF NOT EXISTS `maintenance_log` (
  `id`           BIGINT        NOT NULL,
  `user_id`      BIGINT        NOT NULL,
  `car_id`       BIGINT        NOT NULL,
  `item_key`     VARCHAR(16)   NOT NULL,
  `item_name`    VARCHAR(32)   NOT NULL,
  `icon`         VARCHAR(8)    NULL,
  `mileage`      INT           NOT NULL,
  `cost`         DECIMAL(8,2)  NOT NULL DEFAULT 0,
  `shop`         VARCHAR(64)   NULL,
  `note`         VARCHAR(128)  NULL,
  `service_date` VARCHAR(10)   NOT NULL,
  `create_time`  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `update_time`  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted`      TINYINT       NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`)
);

CREATE INDEX IF NOT EXISTS `idx_maint_car_item` ON `maintenance_log` (`car_id`, `item_key`);
