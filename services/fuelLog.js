/**
 * 加油记录服务
 * 负责增删改查 + 联动更新车辆里程 + 调用油耗引擎做汇总
 */

const storage = require('../utils/storage');
const fuel = require('./fuel');
const carService = require('./car');

const KEY = 'fuel_logs';

function getAllRaw() {
  carService.seedIfNeeded();
  return storage.get(KEY, []);
}

/** 某台车的记录，按里程升序（图表与油耗计算都需要） */
function listByCar(carId) {
  return getAllRaw()
    .filter((l) => l.carId === carId)
    .map((l) => ({ ...l, createdAt: new Date(l.createdAt).getTime() }))
    .sort((a, b) => a.mileage - b.mileage || a.createdAt - b.createdAt);
}

/** 某台车的记录，按时间倒序（列表展示用，最新的在上） */
function listByCarDesc(carId) {
  return listByCar(carId)
    .slice()
    .sort((a, b) => b.createdAt - a.createdAt);
}

/**
 * 带油耗的记录列表
 * 返回 { list: 倒序含油耗, summary: 汇总 }
 */
function listWithConsumption(carId) {
  const rows = listByCar(carId);
  const computed = fuel.calcConsumption(rows);
  const summary = fuel.summarize(rows);

  // 倒序给列表用，但把 consumption 从升序结果里带过来
  const byId = new Map(computed.map((r) => [r.id, r]));
  const desc = computed
    .slice()
    .sort((a, b) => b.createdAt - a.createdAt)
    .map((r) => byId.get(r.id));

  return { list: desc, asc: computed, summary };
}

function getById(id) {
  const raw = getAllRaw().find((l) => l.id === id);
  if (!raw) return null;
  return { ...raw, createdAt: new Date(raw.createdAt).getTime() };
}

/** 新增记录 */
function create(data) {
  const list = getAllRaw();
  const liters = Number(data.liters) || 0;
  const price = Number(data.price) || 0;
  // 金额优先用传入值（真实加油站有抹零），没传才用 升数×单价 计算
  const amount =
    data.amount !== undefined && data.amount !== null && data.amount !== ''
      ? Number(data.amount)
      : +(liters * price).toFixed(2);

  const rec = {
    id: 'f_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
    carId: data.carId,
    mileage: Number(data.mileage) || 0,
    liters: +liters.toFixed(2),
    price: +price.toFixed(2),
    amount: +amount.toFixed(2),
    isFull: !!data.isFull,
    createdAt:
      typeof data.createdAt === 'number'
        ? data.createdAt
        : new Date(data.createdAt || Date.now()).getTime(),
    station: data.station || '',
    note: data.note || ''
  };

  list.push(rec);
  storage.set(KEY, list);
  carService.syncOdometer(data.carId);

  return rec;
}

function update(id, patch) {
  const list = getAllRaw();
  const idx = list.findIndex((l) => l.id === id);
  if (idx === -1) return null;

  const cur = list[idx];
  const liters = patch.liters !== undefined ? Number(patch.liters) : cur.liters;
  const price = patch.price !== undefined ? Number(patch.price) : cur.price;
  const amount =
    patch.amount !== undefined
      ? Number(patch.amount)
      : +(liters * price).toFixed(2);

  list[idx] = {
    ...cur,
    ...patch,
    mileage: patch.mileage !== undefined ? Number(patch.mileage) : cur.mileage,
    liters: +liters.toFixed(2),
    price: +price.toFixed(2),
    amount: +amount.toFixed(2),
    createdAt:
      patch.createdAt !== undefined
        ? typeof patch.createdAt === 'number'
          ? patch.createdAt
          : new Date(patch.createdAt).getTime()
        : cur.createdAt
  };

  storage.set(KEY, list);
  carService.syncOdometer(cur.carId);
  return list[idx];
}

function remove(id) {
  const list = getAllRaw();
  const target = list.find((l) => l.id === id);
  const next = list.filter((l) => l.id !== id);
  storage.set(KEY, next);
  if (target) carService.syncOdometer(target.carId);
  return true;
}

/**
 * 校验一条新记录是否合理
 * 这些校验是防呆：里程倒退、油耗离谱、单价异常，都是用户填错的高发区
 */
function validate(data, carId) {
  const errors = [];

  const mileage = Number(data.mileage);
  const liters = Number(data.liters);
  const price = Number(data.price);

  if (!mileage || mileage <= 0) {
    errors.push('请填写当前里程');
  }
  if (!liters || liters <= 0) {
    errors.push('请填写加油升数');
  }
  if (liters > 200) {
    errors.push('加油量超过 200L，请检查是否填错');
  }
  if (!price || price <= 0) {
    errors.push('请填写油价');
  }
  if (price > 20) {
    errors.push('油价超过 20 元/L，请检查是否填错');
  }

  // 里程不能小于该车已有记录的最大里程（除非是编辑自己）
  const rows = listByCar(carId).filter((r) => r.id !== data.id);
  if (rows.length > 0 && mileage > 0) {
    const maxMileage = Math.max(...rows.map((r) => r.mileage));
    if (mileage < maxMileage) {
      errors.push(`里程不能小于已有记录的最大里程 ${maxMileage}km`);
    }
  }

  return errors;
}

/**
 * 里程合理性提示（非阻断）
 * 用户填的里程小于车辆当前里程时，不报错但应该给个提醒，
 * 因为这通常意味着填错了；也可能是补录历史记录，属于合法场景。
 */
function mileageWarning(data, carId) {
  const mileage = Number(data.mileage);
  if (!mileage) return '';
  const rows = listByCar(carId).filter((r) => r.id !== data.id);
  const car = carService.getById(carId);
  const current = car ? Number(car.odometer) || 0 : 0;

  if (rows.length === 0 && current > 0 && mileage < current) {
    return `比车辆登记里程 ${current}km 小，确认是补录历史记录吗？`;
  }
  return '';
}

/**
 * 上一笔里程，用于表单里自动填入参考值
 */
function lastMileage(carId) {
  const rows = listByCar(carId);
  if (rows.length === 0) return null;
  return Math.max(...rows.map((r) => r.mileage));
}

/** 某月花费（本月） */
function monthSpend(carId, refDate = new Date()) {
  const rows = listByCar(carId);
  const y = refDate.getFullYear();
  const m = refDate.getMonth();
  return rows
    .filter((r) => {
      const d = new Date(r.createdAt);
      return d.getFullYear() === y && d.getMonth() === m;
    })
    .reduce((s, r) => s + r.amount, 0);
}

module.exports = {
  getAllRaw,
  listByCar,
  listByCarDesc,
  listWithConsumption,
  getById,
  create,
  update,
  remove,
  validate,
  mileageWarning,
  lastMileage,
  monthSpend
};
