/**
 * Mock 数据：车辆 + 加油记录 + 保养记录
 *
 * 数据设计原则：
 * 1. 加油记录要「像真的」——里程递增合理、油价有波动、油耗有小幅震荡，
 *    而不是每次都是整 8.0L/100km 这种假数据
 * 2. 时间跨度覆盖近 6 个月，让统计图表有内容
 * 3. 保留一个「保养即将到期」的项目，让提醒卡有东西可显示
 */

/** 车辆 */
const CARS = [
  {
    id: 'car_1',
    brand: '大众',
    model: '速腾',
    year: 2021,
    plate: '鲁A·8K2M9',
    fuelType: '92#',
    tankCapacity: 55,
    color: '#00D4FF',
    // 当前里程（会随加油记录自动更新为最大值）
    odometer: 48620,
    purchaseDate: '2021-06-18',
    insuranceExpiry: '2026-06-18',
    inspectionExpiry: '2027-06-01'
  },
  {
    id: 'car_2',
    brand: '比亚迪',
    model: '宋 PLUS',
    year: 2023,
    plate: '鲁A·3F7T2',
    fuelType: '92#',
    tankCapacity: 60,
    color: '#32D74B',
    odometer: 21840,
    purchaseDate: '2023-09-02',
    insuranceExpiry: '2026-09-02',
    inspectionExpiry: '2029-09-01'
  }
];

/**
 * 加油记录
 * mileage 里程、liters 升数、price 单价、amount 金额、isFull 是否加满
 * 注意 amount 允许与 liters*price 有几分钱差异（真实加油站的抹零）
 */
const FUEL_LOGS = [
  // ============ car_1 大众速腾 · 近 6 个月 ============
  { id: 'f1', carId: 'car_1', mileage: 42100, liters: 45.2, price: 7.89, amount: 356.63, isFull: true, createdAt: '2026-05-08T18:30:00+08:00', station: '中石化经十路站', note: '跑高速前加满' },
  { id: 'f2', carId: 'car_1', mileage: 42680, liters: 42.8, price: 7.92, amount: 338.98, isFull: true, createdAt: '2026-05-24T09:12:00+08:00', station: '中石化经十路站', note: '' },
  { id: 'f3', carId: 'car_1', mileage: 43150, liters: 20.5, price: 7.85, amount: 160.93, isFull: false, createdAt: '2026-06-06T20:05:00+08:00', station: '中石油舜耕路站', note: '只加了200块' },
  { id: 'f4', carId: 'car_1', mileage: 43820, liters: 50.6, price: 8.12, amount: 410.87, isFull: true, createdAt: '2026-06-21T17:48:00+08:00', station: '中石化经十路站', note: '油价涨了' },
  { id: 'f5', carId: 'car_1', mileage: 44480, liters: 49.3, price: 8.05, amount: 396.87, isFull: true, createdAt: '2026-07-09T08:20:00+08:00', station: '山东石化二环东', note: '' },
  { id: 'f6', carId: 'car_1', mileage: 45020, liters: 43.1, price: 7.76, amount: 334.46, isFull: true, createdAt: '2026-07-26T19:15:00+08:00', station: '中石油舜耕路站', note: '周末自驾' },
  { id: 'f7', carId: 'car_1', mileage: 45660, liters: 48.9, price: 7.68, amount: 375.55, isFull: true, createdAt: '2026-08-14T12:40:00+08:00', station: '中石化经十路站', note: '' },
  { id: 'f8', carId: 'car_1', mileage: 46280, liters: 24.6, price: 7.71, amount: 189.67, isFull: false, createdAt: '2026-09-02T21:00:00+08:00', station: '中石化经十路站', note: '路过随手加点' },
  { id: 'f9', carId: 'car_1', mileage: 46920, liters: 46.8, price: 7.55, amount: 353.34, isFull: true, createdAt: '2026-09-28T10:30:00+08:00', station: '山东石化二环东', note: '' },
  { id: 'f10', carId: 'car_1', mileage: 47530, liters: 44.2, price: 7.62, amount: 336.80, isFull: true, createdAt: '2026-10-16T16:20:00+08:00', station: '中石化经十路站', note: '' },
  { id: 'f11', carId: 'car_1', mileage: 48150, liters: 45.9, price: 7.48, amount: 343.33, isFull: true, createdAt: '2026-10-31T07:50:00+08:00', station: '中石油舜耕路站', note: '月底便宜两毛' },

  // ============ car_2 比亚迪宋 ============
  { id: 'f20', carId: 'car_2', mileage: 18600, liters: 48.5, price: 7.89, amount: 382.67, isFull: true, createdAt: '2026-07-15T15:00:00+08:00', station: '中石化高新区站', note: '' },
  { id: 'f21', carId: 'car_2', mileage: 19250, liters: 50.2, price: 7.70, amount: 386.54, isFull: true, createdAt: '2026-08-20T11:30:00+08:00', station: '中石化高新区站', note: '' },
  { id: 'f22', carId: 'car_2', mileage: 19920, liters: 51.8, price: 7.58, amount: 392.64, isFull: true, createdAt: '2026-09-25T14:10:00+08:00', station: '山东石化奥体站', note: '' },
  { id: 'f23', carId: 'car_2', mileage: 20560, liters: 46.7, price: 7.65, amount: 357.26, isFull: true, createdAt: '2026-10-22T18:45:00+08:00', station: '中石化高新区站', note: '' }
];

/**
 * 保养项目模板
 * 每项：名称、图标、周期（里程 / 月数，二者任一先到即提醒）
 */
const MAINTENANCE_TEMPLATES = [
  { key: 'oil', name: '更换机油机滤', icon: '🛢️', kmCycle: 7500, monthCycle: 6, desc: '全合成机油建议 7500km 或 6 个月' },
  { key: 'air', name: '空气滤芯', icon: '💨', kmCycle: 15000, monthCycle: 12, desc: '影响进气与油耗' },
  { key: 'cabin', name: '空调滤芯', icon: '❄️', kmCycle: 15000, monthCycle: 12, desc: '建议每年入夏前更换' },
  { key: 'spark', name: '火花塞', icon: '⚡', kmCycle: 40000, monthCycle: 36, desc: '影响点火与动力' },
  { key: 'brake', name: '刹车片', icon: '🛑', kmCycle: 40000, monthCycle: 36, desc: '磨损到 3mm 需更换' },
  { key: 'tire', name: '轮胎换位', icon: '⚙️', kmCycle: 20000, monthCycle: 24, desc: '让轮胎磨损更均匀' },
  { key: 'coolant', name: '防冻液', icon: '🧊', kmCycle: 60000, monthCycle: 48, desc: '避免冬季冻裂水箱' },
  { key: 'battery', name: '电瓶检查', icon: '🔋', kmCycle: 50000, monthCycle: 36, desc: '寿命一般 3-5 年' }
];

/**
 * 保养记录
 * 记录每台车各项保养「上次做的时间 + 里程」，用于推算下次到期
 */
const MAINTENANCE_LOGS = [
  // car_1
  { id: 'm1', carId: 'car_1', key: 'oil', name: '更换机油机滤', icon: '🛢️', date: '2026-03-15', mileage: 40200, cost: 420, shop: '4S 店', note: '全合成' },
  { id: 'm2', carId: 'car_1', key: 'air', name: '空气滤芯', icon: '💨', date: '2026-03-15', mileage: 40200, cost: 120, shop: '4S 店', note: '' },
  { id: 'm3', carId: 'car_1', key: 'cabin', name: '空调滤芯', icon: '❄️', date: '2026-05-20', mileage: 42400, cost: 98, shop: '自购更换', note: '换的活性炭款' },
  { id: 'm4', carId: 'car_1', key: 'brake', name: '刹车片', icon: '🛑', date: '2025-11-08', mileage: 35200, cost: 680, shop: '4S 店', note: '前轮' },
  { id: 'm5', carId: 'car_1', key: 'tire', name: '轮胎换位', icon: '⚙️', date: '2026-01-20', mileage: 37800, cost: 80, shop: '轮胎店', note: '' },

  // car_2
  { id: 'm11', carId: 'car_2', key: 'oil', name: '更换机油机滤', icon: '🛢️', date: '2026-08-10', mileage: 19000, cost: 380, shop: '4S 店', note: '首保后二次' },
  { id: 'm12', carId: 'car_2', key: 'air', name: '空气滤芯', icon: '💨', date: '2026-08-10', mileage: 19000, cost: 110, shop: '4S 店', note: '' },
  { id: 'm13', carId: 'car_2', key: 'cabin', name: '空调滤芯', icon: '❄️', date: '2026-04-18', mileage: 16200, cost: 90, shop: '4S 店', note: '' }
];

/** 首页轮播提示 */
const TIPS = [
  '连续两次加满之间的数据，才能算准油耗',
  '记录时勾选「加满」，油耗曲线会更平滑',
  '保养按「里程或时间」先到者提醒，别只看里程',
  '油耗突然涨 1L 以上，先查胎压和空气滤芯'
];

module.exports = { CARS, FUEL_LOGS, MAINTENANCE_TEMPLATES, MAINTENANCE_LOGS, TIPS };
