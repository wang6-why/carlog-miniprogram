package com.carlog.config;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.carlog.entity.Car;
import com.carlog.entity.FuelLog;
import com.carlog.entity.MaintenanceLog;
import com.carlog.entity.User;
import com.carlog.mapper.CarMapper;
import com.carlog.mapper.FuelLogMapper;
import com.carlog.mapper.MaintenanceLogMapper;
import com.carlog.mapper.UserMapper;

/**
 * 示例数据灌入
 *
 * 只在 user 表为空时执行一次，避免每次重启重复插入。
 * 数据与小程序 mock/data.js 对齐：两辆车、近 6 个月加油记录，
 * 并刻意留一项「保养即将到期」，让看板有东西可显示。
 */
@Configuration
@ConditionalOnProperty(name = "carlog.seed.enabled", havingValue = "true", matchIfMissing = true)
public class DataSeeder {

    private static final Logger log = LoggerFactory.getLogger(DataSeeder.class);

    @Bean
    public ApplicationRunner seedRunner(UserMapper userMapper, CarMapper carMapper,
                                        FuelLogMapper fuelMapper, MaintenanceLogMapper maintMapper) {
        return args -> {
            if (userMapper.selectCount(Wrappers.emptyWrapper()) > 0) {
                return;
            }

            BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();

            User demo = new User();
            demo.setId(1001L);
            demo.setUsername("demo");
            demo.setPassword(encoder.encode("123456"));
            demo.setNickname("演示车主");
            demo.setRole("USER");
            demo.setDeleted(0);
            userMapper.insert(demo);

            User admin = new User();
            admin.setId(1002L);
            admin.setUsername("admin");
            admin.setPassword(encoder.encode("admin123"));
            admin.setNickname("管理员");
            admin.setRole("ADMIN");
            admin.setDeleted(0);
            userMapper.insert(admin);

            Car car1 = car(2001L, 1001L, "大众", "速腾", 2021, "鲁A·8K2M9",
                    new BigDecimal("55.0"), "#00D4FF", 48620,
                    "2021-06-18", "2026-06-18", "2027-06-01");
            Car car2 = car(2002L, 1001L, "比亚迪", "宋 PLUS", 2023, "鲁A·3F7T2",
                    new BigDecimal("60.0"), "#32D74B", 21840,
                    "2023-09-02", "2026-09-02", "2029-09-01");
            carMapper.insert(car1);
            carMapper.insert(car2);

            List<FuelLog> fuels = new ArrayList<>();
            fuels.add(fuel(3001L, 2001L, 42100, "45.20", "7.89", "356.63", true, "2026-05-08", "中石化经十路站", "跑高速前加满"));
            fuels.add(fuel(3002L, 2001L, 42680, "42.80", "7.92", "338.98", true, "2026-05-24", "中石化经十路站", ""));
            fuels.add(fuel(3003L, 2001L, 43150, "20.50", "7.85", "160.93", false, "2026-06-06", "中石油舜耕路站", "只加了 200 块"));
            fuels.add(fuel(3004L, 2001L, 43820, "50.60", "8.12", "410.87", true, "2026-06-21", "中石化经十路站", "油价涨了"));
            fuels.add(fuel(3005L, 2001L, 44480, "49.30", "8.05", "396.87", true, "2026-07-09", "山东石化二环东", ""));
            fuels.add(fuel(3006L, 2001L, 45020, "43.10", "7.76", "334.46", true, "2026-07-26", "中石油舜耕路站", "周末自驾"));
            fuels.add(fuel(3007L, 2001L, 45660, "48.90", "7.68", "375.55", true, "2026-08-14", "中石化经十路站", ""));
            fuels.add(fuel(3008L, 2001L, 46280, "24.60", "7.71", "189.67", false, "2026-09-02", "中石化经十路站", "路过随手加点"));
            fuels.add(fuel(3009L, 2001L, 46920, "46.80", "7.55", "353.34", true, "2026-09-28", "山东石化二环东", ""));
            fuels.add(fuel(3010L, 2001L, 47530, "44.20", "7.62", "336.80", true, "2026-10-16", "中石化经十路站", ""));
            fuels.add(fuel(3011L, 2001L, 48150, "45.90", "7.48", "343.33", true, "2026-10-31", "中石油舜耕路站", "月底便宜两毛"));

            fuels.add(fuel(3021L, 2002L, 18600, "48.50", "7.89", "382.67", true, "2026-07-15", "中石化高新区站", ""));
            fuels.add(fuel(3022L, 2002L, 19250, "50.20", "7.70", "386.54", true, "2026-08-20", "中石化高新区站", ""));
            fuels.add(fuel(3023L, 2002L, 19920, "51.80", "7.58", "392.64", true, "2026-09-25", "山东石化奥体站", ""));
            fuels.add(fuel(3024L, 2002L, 20560, "46.70", "7.65", "357.26", true, "2026-10-22", "中石化高新区站", ""));

            fuels.forEach(fuelMapper::insert);

            maintMapper.insert(maint(4001L, 2001L, "oil", "更换机油机滤", "🛢️", 40200, "420.00", "4S 店", "全合成", "2026-03-15"));
            maintMapper.insert(maint(4002L, 2001L, "air", "空气滤芯", "💨", 40200, "120.00", "4S 店", "", "2026-03-15"));
            maintMapper.insert(maint(4003L, 2001L, "cabin", "空调滤芯", "❄️", 42400, "98.00", "自购更换", "活性炭款", "2026-05-20"));
            maintMapper.insert(maint(4004L, 2001L, "brake", "刹车片", "🛑", 35200, "680.00", "4S 店", "前轮", "2025-11-08"));
            maintMapper.insert(maint(4005L, 2001L, "tire", "轮胎换位", "⚙️", 37800, "80.00", "轮胎店", "", "2026-01-20"));
            maintMapper.insert(maint(4011L, 2002L, "oil", "更换机油机滤", "🛢️", 19000, "380.00", "4S 店", "首保后二次", "2026-08-10"));
            maintMapper.insert(maint(4012L, 2002L, "air", "空气滤芯", "💨", 19000, "110.00", "4S 店", "", "2026-08-10"));
            maintMapper.insert(maint(4013L, 2002L, "cabin", "空调滤芯", "❄️", 16200, "90.00", "4S 店", "", "2026-04-18"));

            log.info("示例数据已灌入：demo/123456（普通用户）、admin/admin123（管理员），2 辆车 / {} 条加油 / 8 条保养",
                    fuels.size());
            log.info("今天是 {}，加油记录的日期是按固定值写入的，若与当前月份跨度变大，统计图会偏左", LocalDate.now());
        };
    }

    private Car car(Long id, Long userId, String brand, String model, Integer year, String plate,
                    BigDecimal tank, String color, Integer odometer,
                    String purchase, String insurance, String inspection) {
        Car c = new Car();
        c.setId(id);
        c.setUserId(userId);
        c.setBrand(brand);
        c.setModel(model);
        c.setModelYear(year);
        c.setPlate(plate);
        c.setFuelType("92#");
        c.setTankCapacity(tank);
        c.setColor(color);
        c.setOdometer(odometer);
        c.setPurchaseDate(purchase);
        c.setInsuranceExpiry(insurance);
        c.setInspectionExpiry(inspection);
        c.setDeleted(0);
        return c;
    }

    private FuelLog fuel(Long id, Long carId, Integer mileage, String liters, String price,
                         String amount, boolean full, String date, String station, String note) {
        FuelLog f = new FuelLog();
        f.setId(id);
        f.setUserId(1001L);
        f.setCarId(carId);
        f.setMileage(mileage);
        f.setLiters(new BigDecimal(liters));
        f.setPrice(new BigDecimal(price));
        f.setAmount(new BigDecimal(amount));
        f.setIsFull(full);
        f.setFuelDate(date);
        f.setStation(station);
        f.setNote(note);
        f.setDeleted(0);
        return f;
    }

    private MaintenanceLog maint(Long id, Long carId, String key, String name, String icon,
                                 Integer mileage, String cost, String shop, String note, String date) {
        MaintenanceLog m = new MaintenanceLog();
        m.setId(id);
        m.setUserId(1001L);
        m.setCarId(carId);
        m.setItemKey(key);
        m.setItemName(name);
        m.setIcon(icon);
        m.setMileage(mileage);
        m.setCost(new BigDecimal(cost));
        m.setShop(shop);
        m.setNote(note);
        m.setServiceDate(date);
        m.setDeleted(0);
        return m;
    }
}
