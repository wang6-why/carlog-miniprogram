/**
 * 保养服务
 *
 * ============ 核心逻辑 ============
 * 保养提醒的规则是「里程或时间，先到者提醒」。
 * 这两个维度必须都算，只算里程会导致：车开得少的用户永远等不到保养提醒，
 * 而机油是会随时间氧化的，放着不开也要换。
 *
 * 状态定义：
 *   overdue   已超期（里程或时间任一已超）
 *   soon      即将到期（剩余里程 <= 500km，或剩余天数 <= 30 天）
 *   normal    正常
 */

const storage = require('../utils/storage');
const carService = require('./car');
const mock = require('../mock/data');
const format = require('../utils/format');

const KEY = 'maintenance_logs';

/* 阈值：剩余多少算「即将到期」 */
const SOON_KM = 500;
const SOON_DAYS = 30;

function getAllRaw() {
  carService.seedIfNeeded();
  return storage.get(KEY, []);
}

function listByCar(carId) {
  return getAllRaw()
    .filter((m) => m.carId === carId)
    .sort((a, b) => new Date(b.date) - new Date(a.date));
}

/** 项目模板 */
function templates() {
  return mock.MAINTENANCE_TEMPLATES;
}

function getTemplate(key) {
  return mock.MAINTENANCE_TEMPLATES.find((t) => t.key === key) || null;
}

/**
 * 计算保养状态
 *
 * @param {Object} lastLog 上次保养记录（可能为 null，表示从未做过）
 * @param {Object} tpl 模板（含周期）
 * @param {Object} car 车辆（提供当前里程）
 * @returns {Object} 状态详情
 */
function calcStatus(lastLog, tpl, car) {
  const currentMileage = Number(car.odometer) || 0;
  const today = format.todayStart();

  // 从未做过：视为未知，建议尽快检查
  if (!lastLog) {
    return {
      key: tpl.key,
      name: tpl.name,
      icon: tpl.icon,
      desc: tpl.desc,
      lastDate: null,
      lastMileage: null,
      nextMileage: null,
      nextDate: null,
      remainKm: null,
      remainDays: null,
      percent: 0,
      status: 'unknown',
      statusText: '暂无记录',
      severity: 1 // 排序权重：unknown 放中间
    };
  }

  const lastMileage = Number(lastLog.mileage) || 0;
  // 用 parseDate 而不是 new Date(str)，避免 'YYYY-MM-DD' 被当 UTC 解析导致差一天
  const lastDate = format.parseDate(lastLog.date);

  // 下次到期里程 / 时间
  const nextMileage = tpl.kmCycle ? lastMileage + tpl.kmCycle : null;
  const nextDate = tpl.monthCycle ? addMonths(lastDate, tpl.monthCycle) : null;

  const remainKm = nextMileage !== null ? nextMileage - currentMileage : null;
  const remainDays = nextDate !== null ? format.daysUntil(nextDate) : null;

  // 已行驶比例（用于进度条）
  let percent = 0;
  if (tpl.kmCycle && tpl.kmCycle > 0) {
    percent = Math.min(100, Math.max(0, ((currentMileage - lastMileage) / tpl.kmCycle) * 100));
  } else if (tpl.monthCycle) {
    const passed = (today - lastDate) / (1000 * 60 * 60 * 24);
    const total = tpl.monthCycle * 30.4;
    percent = Math.min(100, Math.max(0, (passed / total) * 100));
  }

  // 判断状态：任一维度超期即 overdue
  let status = 'normal';
  if ((remainKm !== null && remainKm <= 0) || (remainDays !== null && remainDays <= 0)) {
    status = 'overdue';
  } else if (
    (remainKm !== null && remainKm <= SOON_KM) ||
    (remainDays !== null && remainDays <= SOON_DAYS)
  ) {
    status = 'soon';
  }

  const statusMap = {
    overdue: { text: '已超期', severity: 0 },
    soon: { text: '即将到期', severity: 1 },
    normal: { text: '正常', severity: 3 }
  };

  return {
    key: tpl.key,
    name: tpl.name,
    icon: tpl.icon,
    desc: tpl.desc,
    lastDate,
    lastMileage,
    nextMileage,
    nextDate,
    remainKm,
    remainDays,
    percent: Math.round(percent),
    status,
    statusText: statusMap[status].text,
    severity: statusMap[status].severity
  };
}

/**
 * 加 N 个月，正确处理月末溢出
 *
 * 易错点：直接 d.setMonth(d.getMonth() + n) 会溢出。
 * 例如 2026-01-31 setMonth(1) 得到 2月31日 → JS 自动滚到 3月3日，完全错位。
 * 这里的做法是：先算出目标年月的「该月最后一天」，再取 min(原日, 最后一天)。
 */
function addMonths(ts, months) {
  const d = new Date(ts);
  const day = d.getDate();
  const year = d.getFullYear();
  const month = d.getMonth() + months;

  // 目标月份的第一天，再回退一天得到该月最后一天
  const lastDayOfTargetMonth = new Date(year, month + 1, 0).getDate();

  d.setDate(1); // 先归 1 号，避免中途溢出
  d.setFullYear(year);
  d.setMonth(month);
  d.setDate(Math.min(day, lastDayOfTargetMonth));
  return d.getTime();
}

/**
 * 某台车的完整保养看板
 * 返回所有模板对应的状态，按紧急程度排序
 */
function getBoard(carId) {
  const car = carService.getById(carId);
  if (!car) return { items: [], counts: { overdue: 0, soon: 0, normal: 0, unknown: 0 } };

  const logs = listByCar(carId);

  // 每个 key 取最近一次记录
  const latestByKey = new Map();
  for (const log of logs) {
    if (!latestByKey.has(log.key)) latestByKey.set(log.key, log);
  }

  const items = mock.MAINTENANCE_TEMPLATES.map((tpl) =>
    calcStatus(latestByKey.get(tpl.key) || null, tpl, car)
  ).sort((a, b) => a.severity - b.severity || (a.remainKm || 0) - (b.remainKm || 0));

  const counts = { overdue: 0, soon: 0, normal: 0, unknown: 0 };
  items.forEach((i) => {
    counts[i.status] = (counts[i.status] || 0) + 1;
  });

  return { items, counts, car };
}

/** 只取需要关注的（超期 + 即将），首页提醒用 */
function getAlerts(carId, limit = 3) {
  const board = getBoard(carId);
  return board.items.filter((i) => i.status === 'overdue' || i.status === 'soon').slice(0, limit);
}

/** 新增保养记录 */
function create(data) {
  const list = getAllRaw();
  const rec = {
    id: 'm_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
    carId: data.carId,
    key: data.key,
    name: data.name || (getTemplate(data.key) || {}).name || '保养项目',
    icon: data.icon || (getTemplate(data.key) || {}).icon || '🔧',
    date: data.date || format.date(Date.now()),
    mileage: Number(data.mileage) || 0,
    cost: Number(data.cost) || 0,
    shop: data.shop || '',
    note: data.note || ''
  };
  list.push(rec);
  storage.set(KEY, list);
  return rec;
}

function update(id, patch) {
  const list = getAllRaw();
  const idx = list.findIndex((m) => m.id === id);
  if (idx === -1) return null;
  list[idx] = { ...list[idx], ...patch };
  storage.set(KEY, list);
  return list[idx];
}

function remove(id) {
  const list = getAllRaw().filter((m) => m.id !== id);
  storage.set(KEY, list);
  return true;
}

module.exports = {
  templates,
  getTemplate,
  getBoard,
  getAlerts,
  listByCar,
  create,
  update,
  remove,
  // 导出供单元测试使用，业务代码不直接调用
  _addMonths: addMonths,
  _calcStatus: calcStatus
};
