/**
 * 端到端流程模拟
 * 模拟真实用户操作序列，验证各服务层协同工作正常
 */
const store = {};
global.wx = {
  getStorageSync: (k) => (k in store ? store[k] : ''),
  setStorageSync: (k, v) => { store[k] = v; },
  removeStorageSync: (k) => { delete store[k]; },
  getStorageInfoSync: () => ({ keys: Object.keys(store) })
};

const carService = require('../services/car');
const fuelLog = require('../services/fuelLog');
const maintenance = require('../services/maintenance');
const fuel = require('../services/fuel');
const format = require('../utils/format');

let pass = 0, fail = 0;
function check(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) { pass++; console.log(`  ✓ ${name}`); }
  else { fail++; console.log(`  ✗ ${name}\n      期望: ${JSON.stringify(expected)}\n      实际: ${JSON.stringify(actual)}`); }
}
function checkRange(name, actual, min, max) {
  const ok = actual >= min && actual <= max;
  if (ok) { pass++; console.log(`  ✓ ${name} (${actual})`); }
  else { fail++; console.log(`  ✗ ${name}\n      期望范围: ${min} ~ ${max}\n      实际: ${actual}`); }
}

console.log('\n' + '='.repeat(50));
console.log('端到端流程模拟');
console.log('='.repeat(50));

console.log('\n【第 1 步】首次打开小程序');
carService.seedIfNeeded();
const cars = carService.getAll();
check('灌入 2 台车', cars.length, 2);
const carId = 'car_1';
const car = carService.getById(carId);
console.log(`  当前车辆: ${car.brand} ${car.model}, 里程 ${car.odometer}km`);

console.log('\n【第 2 步】查看油耗汇总');
let { asc, summary } = fuelLog.listWithConsumption(carId);
console.log(`  记录 ${summary.recordCount} 条`);
console.log(`  平均油耗 ${summary.avgConsumption ? format.fixed(summary.avgConsumption, 2) : '--'} L/100km`);
console.log(`  最近油耗 ${summary.latestConsumption ? format.fixed(summary.latestConsumption, 2) : '--'} L/100km`);
console.log(`  记录里程 ${summary.totalKm}km, 总花费 ¥${format.money(summary.totalAmount)}`);
check('有 11 条 mock 记录', summary.recordCount, 11);
checkRange('平均油耗在合理范围 6.5-8.5', +summary.avgConsumption.toFixed(2), 6.5, 8.5);
check('记录里程 = 48150 - 42100', summary.totalKm, 6050);

console.log('\n【第 3 步】新车第一次加油（作为基准点）');
const beforeCount = summary.recordCount;
const car2Logs = fuelLog.listByCar('car_2');
const car2MaxMileage = Math.max(...car2Logs.map(l => l.mileage));
// 注意：要基于「车辆当前里程」往上加，而不是基于最大记录里程。
// mock 里 car_2 的 odometer(21840) 比最大加油里程(20560) 大，
// 因为用户可能只记加油不记里程，所以真实场景必须以 odometer 为基准。
const car2Current = carService.getById('car_2').odometer;
const newMileage = car2Current + 600;
const r1 = fuelLog.create({
  carId: 'car_2',
  mileage: newMileage,
  liters: 48,
  price: 7.7,
  isFull: true,
  createdAt: Date.now(),
  station: '测试加油站'
});
console.log(`  新记录: ${r1.mileage}km, ${r1.liters}L, ¥${r1.amount}, 加满=${r1.isFull}`);
check('金额自动计算 48*7.7', r1.amount, 369.6);

console.log('\n【第 4 步】验证油耗自动算出');
const car2Result = fuelLog.listWithConsumption('car_2');
const newRec = car2Result.asc.find(r => r.id === r1.id);
console.log(`  新记录油耗: ${newRec.consumption ? format.fixed(newRec.consumption, 2) : 'null'} L/100km`);
console.log(`  区间里程: ${newRec.segmentKm}km, 区间油量: ${newRec.segmentLiters}L`);
check('新记录能算出油耗', newRec.consumption !== null, true);

// 预期值必须按实际算法算，不能凭感觉写范围：
// 区间里程 = 新里程 - 上一个满油记录里程
// 油耗 = 区间油量 / 区间里程 * 100
const prevFull = car2Logs[car2Logs.length - 1];
const expectedSegKm = newMileage - prevFull.mileage;
const expectedConsumption = (newRec.segmentLiters / expectedSegKm) * 100;
console.log(`  预期区间里程 = ${newMileage} - ${prevFull.mileage} = ${expectedSegKm}km`);
console.log(`  预期油耗 = ${newRec.segmentLiters}/${expectedSegKm}*100 = ${expectedConsumption.toFixed(2)}`);
check('区间里程符合算法', newRec.segmentKm, expectedSegKm);
check('油耗符合算法', +newRec.consumption.toFixed(4), +expectedConsumption.toFixed(4));
checkRange('油耗值在物理合理范围 1-20', +newRec.consumption.toFixed(2), 1, 20);

console.log('\n【第 5 步】验证里程自动同步到车辆');
const car2After = carService.getById('car_2');
console.log(`  车辆里程: ${car2After.odometer}km (原 ${car2Current}km)`);
check('车辆里程已更新为新记录里程', car2After.odometer, newMileage);

console.log('\n【第 6 步】记录一次保养（机油）');
const beforeMaint = maintenance.getBoard('car_2');
const beforeOil = beforeMaint.items.find(i => i.key === 'oil');
console.log(`  保养前机油状态: ${beforeOil.statusText}, 剩余 ${beforeOil.remainKm}km`);
const mrec = maintenance.create({
  carId: 'car_2', key: 'oil', date: format.date(Date.now()),
  mileage: car2After.odometer, cost: 400, shop: '测试店'
});
const afterMaint = maintenance.getBoard('car_2');
const afterOil = afterMaint.items.find(i => i.key === 'oil');
console.log(`  保养后机油状态: ${afterOil.statusText}, 剩余 ${afterOil.remainKm}km`);
check('保养后状态变为 normal', afterOil.status, 'normal');
check('剩余里程 = 7500', afterOil.remainKm, 7500);

console.log('\n【第 7 步】验证里程校验（填错里程应被拦截）');
const errors1 = fuelLog.validate({ mileage: 100, liters: 40, price: 7.5 }, 'car_2');
console.log(`  里程 100km（远小于已有）: ${errors1.length} 个错误`);
console.log(`  → ${errors1[0] || '无'}`);
check('里程倒退被拦截', errors1.length > 0, true);

const errors2 = fuelLog.validate({ mileage: 100000, liters: 0, price: 7.5 }, 'car_2');
check('升数为 0 被拦截', errors2.length > 0, true);

const errors3 = fuelLog.validate({ mileage: 100000, liters: 40, price: 200 }, 'car_2');
console.log(`  油价 200 元/L: ${errors3.join('; ')}`);
check('油价异常被拦截', errors3.length > 0, true);

const errors4 = fuelLog.validate({ mileage: 100000, liters: 300, price: 7.5 }, 'car_2');
check('油量异常被拦截', errors4.length > 0, true);

console.log('\n【第 8 步】验证合法的记录能通过');
const errorsOk = fuelLog.validate({ mileage: 100000, liters: 40, price: 7.5 }, 'car_2');
check('合法数据无错误', errorsOk.length, 0);

console.log('\n【第 9 步】编辑记录（改升数，金额应重算）');
const edited = fuelLog.update(r1.id, { liters: 50 });
console.log(`  改为 50L 后金额: ¥${edited.amount}`);
check('金额重算 = 50*7.7', edited.amount, 385);

console.log('\n【第 10 步】删除记录（油耗应重新计算）');
const beforeDeleteCount = fuelLog.listWithConsumption('car_2').summary.recordCount;
fuelLog.remove(r1.id);
const afterDelete = fuelLog.listWithConsumption('car_2');
console.log(`  删除前 ${beforeDeleteCount} 条 → 删除后 ${afterDelete.summary.recordCount} 条`);
check('记录数减 1', afterDelete.summary.recordCount, beforeDeleteCount - 1);
check('删除的记录已不存在', afterDelete.asc.find(r => r.id === r1.id), undefined);

console.log('\n【第 11 步】双车数据隔离');
const car1Logs = fuelLog.listByCar('car_1');
const car2LogsAfter = fuelLog.listByCar('car_2');
console.log(`  car_1: ${car1Logs.length} 条, car_2: ${car2LogsAfter.length} 条`);
check('car_1 记录未被污染', car1Logs.length, 11);
check('car_2 记录未被污染', car2LogsAfter.length, 4);
check('car_1 的记录 carId 全为 car_1', car1Logs.every(l => l.carId === 'car_1'), true);

console.log('\n【第 12 步】月度聚合');
const months = fuel.groupByMonth(
  fuelLog.listByCar('car_1').map(r => ({ amount: r.amount, liters: r.liters, createdAt: r.createdAt })), 6
);
console.log(`  近 6 个月: ${months.map(m => m.label + '=' + Math.round(m.amount)).join(', ')}`);
check('返回 6 个月', months.length, 6);
check('每月都有 label', months.every(m => m.label), true);

console.log('\n【第 13 步】新增车辆');
const newCar = carService.create({
  brand: '丰田', model: '卡罗拉', year: 2024,
  plate: '鲁A·TEST1', fuelType: '95#', tankCapacity: 50, odometer: 1000
});
console.log(`  新增: ${newCar.brand} ${newCar.model}, id=${newCar.id}`);
check('车辆总数变 3', carService.getAll().length, 3);
const emptySummary = fuelLog.listWithConsumption(newCar.id).summary;
check('新车无记录', emptySummary.recordCount, 0);
check('新车平均油耗为 null', emptySummary.avgConsumption, null);

console.log('\n【第 14 步】删除车辆');
carService.remove(newCar.id);
check('车辆总数回到 2', carService.getAll().length, 2);

console.log('\n【第 15 步】数据持久化（重新读取应一致）');
const reread = fuelLog.listByCar('car_1');
check('重读记录数一致', reread.length, 11);
const firstBefore = asc[0].id;
const firstAfter = reread[0].id;
check('重读首条记录一致', firstAfter, firstBefore);

console.log('\n' + '='.repeat(50));
console.log(`通过 ${pass} 项，失败 ${fail} 项`);
process.exit(fail > 0 ? 1 : 0);
