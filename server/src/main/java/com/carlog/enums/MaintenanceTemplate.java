package com.carlog.enums;

/**
 * 保养项目周期模板
 *
 * 与服务端无关的「业务字典」：周期取自通用手册，不随用户变化。
 * 里程与月数两个周期都存在时，先到者触发提醒。
 */
public enum MaintenanceTemplate {

    OIL("oil", "更换机油机滤", "🛢️", 7500, 6, "全合成机油建议 7500km 或 6 个月"),
    AIR("air", "空气滤芯", "💨", 15000, 12, "影响进气与油耗"),
    CABIN("cabin", "空调滤芯", "❄️", 15000, 12, "建议每年入夏前更换"),
    SPARK("spark", "火花塞", "⚡", 40000, 36, "影响点火与动力"),
    BRAKE("brake", "刹车片", "🛑", 40000, 36, "磨损到 3mm 需更换"),
    TIRE("tire", "轮胎换位", "⚙️", 20000, 24, "让轮胎磨损更均匀"),
    COOLANT("coolant", "防冻液", "🧊", 60000, 48, "避免冬季冻裂水箱"),
    BATTERY("battery", "电瓶检查", "🔋", 50000, 36, "寿命一般 3-5 年");

    private final String key;
    private final String name;
    private final String icon;
    private final Integer kmCycle;
    private final Integer monthCycle;
    private final String desc;

    MaintenanceTemplate(String key, String name, String icon,
                        Integer kmCycle, Integer monthCycle, String desc) {
        this.key = key;
        this.name = name;
        this.icon = icon;
        this.kmCycle = kmCycle;
        this.monthCycle = monthCycle;
        this.desc = desc;
    }

    public static MaintenanceTemplate of(String key) {
        for (MaintenanceTemplate t : values()) {
            if (t.key.equalsIgnoreCase(key)) {
                return t;
            }
        }
        return null;
    }

    public String getKey() { return key; }
    public String getName() { return name; }
    public String getIcon() { return icon; }
    public Integer getKmCycle() { return kmCycle; }
    public Integer getMonthCycle() { return monthCycle; }
    public String getDesc() { return desc; }
}
