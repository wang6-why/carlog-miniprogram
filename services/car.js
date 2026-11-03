/**
 * 车辆服务
 * 数据源：首次从 mock 读入并持久化到 Storage，
 * 之后所有增删改都只操作 Storage，这样用户数据不会因重编译丢失。
 */

const storage = require('../utils/storage');
const mock = require('../mock/data');

const KEY_CARS = 'cars';
const KEY_SEEDED = 'seeded_v1';

/** 首次运行灌入 mock 数据 */
function seedIfNeeded() {
  if (storage.get(KEY_SEEDED)) return;

  storage.set(KEY_CARS, mock.CARS);
  storage.set('fuel_logs', mock.FUEL_LOGS);
  storage.set('maintenance_logs', mock.MAINTENANCE_LOGS);
  storage.set(KEY_SEEDED, true);
}

function getAll() {
  seedIfNeeded();
  return storage.get(KEY_CARS, []);
}

function getById(id) {
  return getAll().find((c) => c.id === id) || null;
}

/** 车辆展示名：大众 速腾 2021 */
function displayName(car) {
  if (!car) return '未选择车辆';
  return `${car.brand} ${car.model}`;
}

function saveAll(list) {
  storage.set(KEY_CARS, list);
}

function update(id, patch) {
  const list = getAll();
  const idx = list.findIndex((c) => c.id === id);
  if (idx === -1) return null;
  list[idx] = { ...list[idx], ...patch };
  saveAll(list);
  return list[idx];
}

function create(data) {
  const list = getAll();
  const car = {
    id: 'car_' + Date.now(),
    brand: data.brand || '未知',
    model: data.model || '车型',
    year: data.year || new Date().getFullYear(),
    plate: data.plate || '',
    fuelType: data.fuelType || '92#',
    tankCapacity: Number(data.tankCapacity) || 50,
    color: data.color || '#00D4FF',
    odometer: Number(data.odometer) || 0,
    purchaseDate: data.purchaseDate || '',
    insuranceExpiry: data.insuranceExpiry || '',
    inspectionExpiry: data.inspectionExpiry || ''
  };
  list.push(car);
  saveAll(list);
  return car;
}

function remove(id) {
  const list = getAll().filter((c) => c.id !== id);
  saveAll(list);
  return list;
}

/**
 * 同步里程：把车辆 odometer 更新为加油记录里的最大里程
 * 这样用户不用手动维护里程，记一笔加油就自动更新
 */
function syncOdometer(carId) {
  const logs = storage.get('fuel_logs', []).filter((l) => l.carId === carId);
  if (logs.length === 0) return;
  const maxMileage = Math.max(...logs.map((l) => Number(l.mileage) || 0));
  const car = getById(carId);
  if (car && maxMileage > (car.odometer || 0)) {
    update(carId, { odometer: maxMileage });
  }
}

module.exports = {
  getAll,
  getById,
  displayName,
  update,
  create,
  remove,
  syncOdometer,
  seedIfNeeded
};
