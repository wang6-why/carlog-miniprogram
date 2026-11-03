/**
 * 仪表盘数据源（远程版）
 *
 * 远程模式下，仪表盘从后端拉数据，但这里刻意复用了小程序本地那套
 * 油耗计算引擎（services/fuel.js），好处是：前端算出来的油耗和后端算出来的
 * 完全一致（同一套加满法加权算法），不会出现「手机显示一个值、后台另一个值」。
 *
 * 返回的数据结构刻意和 dashboard 页面 setData 的字段一一对应，
 * 这样页面只要 this.setData(result) 就行，不用改渲染逻辑。
 */

const config = require('../utils/config');
const format = require('../utils/format');
const fuel = require('./fuel');
const remote = require('./remote');
const auth = require('./auth');
const storage = require('../utils/storage');

const REMOTE_CAR_KEY = 'remote_active_car_id';

function emptyDashboard(cars) {
  return {
    car: null,
    cars: cars || [],
    consumption: null,
    consumptionEmpty: true,
    trendText: '',
    trendClass: '',
    monthSpend: 0,
    totalKm: 0,
    costPerKm: null,
    recordCount: 0,
    alerts: [],
    alertCount: 0,
    recent: [],
    loaded: true
  };
}

async function loadRemote() {
  await auth.ensureLogin();

  const cars = await remote.getCars();
  if (!cars || cars.length === 0) return emptyDashboard([]);

  // 选择当前车辆：优先用上次选中的远程车辆 id
  let carId = storage.get(REMOTE_CAR_KEY);
  let car = cars.find((c) => c.id === carId) || cars[0];
  carId = car.id;
  storage.set(REMOTE_CAR_KEY, carId);

  // 并行拉取看板汇总 + 加油记录
  const [overview, fuelRows] = await Promise.all([
    remote.getOverview(carId),
    remote.getFuelLogs(carId)
  ]);

  // 把后端加油记录映射成本地引擎需要的形状（createdAt 用加油日期转时间戳）
  const mapped = (fuelRows || []).map((r) => ({
    id: r.id,
    carId: r.carId,
    mileage: r.mileage,
    liters: Number(r.liters),
    price: Number(r.price),
    amount: Number(r.amount),
    isFull: !!r.isFull,
    createdAt: format.parseDate(r.fuelDate),
    station: r.station || '',
    note: r.note || ''
  }));

  const asc = fuel.calcConsumption(mapped);
  const summary = fuel.summarize(mapped);
  const latest = summary.latestConsumption;

  let trendText = '';
  let trendClass = '';
  const trend = summary.trend;
  if (trend !== null && trend !== undefined) {
    if (Math.abs(trend) < 0.05) {
      trendText = '持平';
      trendClass = 'c-t3';
    } else if (trend > 0) {
      trendText = `↑ ${format.fixed(trend, 1)} 比上次费油`;
      trendClass = 'c-red';
    } else {
      trendText = `↓ ${format.fixed(Math.abs(trend), 1)} 比上次省油`;
      trendClass = 'c-green';
    }
  }

  // 保养告警：直接用后端算好的（status / percent / remainKm / remainDays 都有）
  const alerts = (overview.alerts || []).map((a) => ({
    ...a,
    hint:
      a.status === 'overdue'
        ? a.remainKm !== null && a.remainKm <= 0
          ? `已超 ${Math.abs(a.remainKm)}km`
          : `已超 ${Math.abs(a.remainDays || 0)} 天`
        : a.remainKm !== null && a.remainKm <= 500
          ? `还剩 ${a.remainKm}km`
          : `还剩 ${a.remainDays} 天`,
    progressWidth: Math.min(100, a.percent),
    barClass: a.status === 'overdue' ? 'bar-red' : 'bar-amber'
  }));

  // 最近 3 条加油记录（倒序）
  const recent = asc
    .slice()
    .reverse()
    .slice(0, 3)
    .map((r) => ({
      ...r,
      dateText: format.monthDay(r.createdAt),
      amountText: format.money(r.amount),
      litersText: format.fixed(r.liters, 1),
      consumptionText: r.consumption !== null ? format.fixed(r.consumption, 2) : '',
      mileageText: format.thousands(r.mileage)
    }));

  return {
    car,
    cars,
    consumption: latest,
    consumptionEmpty: latest === null || latest === undefined,
    trendText,
    trendClass,
    monthSpend: +(overview.monthSpend != null ? overview.monthSpend : 0),
    totalKm: summary.totalKm,
    costPerKm: summary.costPerKm !== null ? format.fixed(summary.costPerKm, 2) : null,
    recordCount: summary.recordCount,
    alerts,
    alertCount: alerts.length,
    recent,
    loaded: true
  };
}

module.exports = { loadRemote, emptyDashboard };
