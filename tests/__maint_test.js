/**
 * 保养状态推算测试
 * 重点验证「里程或时间先到」的双维度逻辑
 */
const path = require('path');

// 模拟小程序环境
const store = {};
global.wx = {
  getStorageSync: (k) => (k in store ? store[k] : ''),
  setStorageSync: (k, v) => { store[k] = v; },
  removeStorageSync: (k) => { delete store[k]; },
  getStorageInfoSync: () => ({ keys: Object.keys(store) })
};

const maint = require('../services/maintenance');
const carService = require('../services/car');
const format = require('../utils/format');

let pass = 0, fail = 0;
function check(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) { pass++; console.log(`  ✓ ${name}`); }
  else { fail++; console.log(`  ✗ ${name}\n      期望: ${JSON.stringify(expected)}\n      实际: ${JSON.stringify(actual)}`); }
}

carService.seedIfNeeded();

const car = carService.getById('car_1');
console.log(`\n测试车辆: ${car.brand} ${car.model}, 当前里程 ${car.odometer}km\n`);

console.log('=== 场景 1：机油（上次 2026-03-15 @ 40200km，周期 7500km / 6 月）===');
{
  const board = maint.getBoard('car_1');
  const oil = board.items.find(i => i.key === 'oil');
  console.log(`  上次: ${format.date(oil.lastDate)} @ ${oil.lastMileage}km`);
  console.log(`  下次里程: ${oil.nextMileage}km, 剩余 ${oil.remainKm}km`);
  console.log(`  下次时间: ${format.date(oil.nextDate)}, 剩余 ${oil.remainDays}天`);
  console.log(`  状态: ${oil.status} (${oil.statusText}), 进度 ${oil.percent}%`);
  // 48620 - 40200 = 8420 > 7500 => 里程已超
  check('里程已超 => overdue', oil.status, 'overdue');
  check('剩余里程为负', oil.remainKm < 0, true);
}

console.log('=== 场景 2：空气滤芯（2026-03-15 @ 40200，周期 15000km / 12月）===');
{
  const board = maint.getBoard('car_1');
  const air = board.items.find(i => i.key === 'air');
  console.log(`  剩余 ${air.remainKm}km / ${air.remainDays}天, 状态 ${air.status}`);
  // 40200 + 15000 = 55200, 48620 => 剩 6580km
  check('剩余里程 = 55200 - 48620', air.remainKm, 6580);
  check('未超期 => normal', air.status, 'normal');
}

console.log('=== 场景 3：刹车片（2025-11-08 @ 35200，周期 40000km / 36月）===');
{
  const board = maint.getBoard('car_1');
  const brake = board.items.find(i => i.key === 'brake');
  console.log(`  剩余 ${brake.remainKm}km / ${brake.remainDays}天, 状态 ${brake.status}`);
  check('剩余里程 = 75200 - 48620', brake.remainKm, 26580);
  check('正常', brake.status, 'normal');
}

console.log('=== 场景 4：从未做过的项目应为 unknown ===');
{
  const board = maint.getBoard('car_1');
  const spark = board.items.find(i => i.key === 'spark');
  check('火花塞从未记录 => unknown', spark.status, 'unknown');
  check('unknown 时 remainKm 为 null', spark.remainKm, null);
}

console.log('=== 场景 5：排序 —— 超期在前，正常在后 ===');
{
  const board = maint.getBoard('car_1');
  const statuses = board.items.map(i => i.status);
  console.log('  排序结果:', statuses.join(' → '));
  const firstOverdueIdx = statuses.indexOf('overdue');
  const lastNormalIdx = statuses.lastIndexOf('normal');
  check('超期排在正常之前', firstOverdueIdx < lastNormalIdx, true);
  check('severity 递增', board.items.every((it, i, arr) => i === 0 || arr[i-1].severity <= it.severity), true);
}

console.log('=== 场景 6：计数正确 ===');
{
  const board = maint.getBoard('car_1');
  const total = board.items.length;
  const sum = board.counts.overdue + board.counts.soon + board.counts.normal + board.counts.unknown;
  console.log(`  总项 ${total}, 超期 ${board.counts.overdue}, 即将 ${board.counts.soon}, 正常 ${board.counts.normal}, 未知 ${board.counts.unknown}`);
  check('各项计数之和 = 总项数', sum, total);
}

console.log('=== 场景 7：即将到期的判定（剩余 < 500km）===');
{
  // 手动造一条快到期：上次里程 = 当前里程 - 7100，周期 7500 => 剩 400km
  const rec = maint.create({
    carId: 'car_1', key: 'tire', date: format.date(Date.now()),
    mileage: 48620 - 20000 + 400, cost: 100
  });
  const board = maint.getBoard('car_1');
  const tire = board.items.find(i => i.key === 'tire');
  console.log(`  轮胎换位: 剩余 ${tire.remainKm}km, 状态 ${tire.status}`);
  check('剩余 400km <= 500 应判定 soon', tire.status, 'soon');
  maint.remove(rec.id);
}

console.log('=== 场景 8：时间维度独立生效（里程没到但时间到了）===');
{
  // 用 spark（火花塞，周期 40000km / 36月，mock 里从未记录）
  // 造一条「3 年前做的，里程几乎等于当前里程」，这样：
  //   里程维度：48620 + 40000 - 48600 = 剩余 40020km，远未到
  //   时间维度：3 年前 + 36 月 = 已超期
  // 正确行为：应判定 overdue，证明时间维度独立生效
  const rec = maint.create({
    carId: 'car_1', key: 'spark', date: '2023-10-01', mileage: 48600, cost: 600
  });
  const board = maint.getBoard('car_1');
  const spark = board.items.find(i => i.key === 'spark');
  console.log(`  火花塞: 上次 ${format.date(spark.lastDate)}, 剩余 ${spark.remainKm}km / ${spark.remainDays}天, 状态 ${spark.status}`);
  check('里程远未到但时间超期 => overdue', spark.status, 'overdue');
  check('剩余里程仍为正（证明是时间维度触发的）', spark.remainKm > 0, true);
  maint.remove(rec.id);
}

console.log('=== 场景 8b：取「最近一次」记录而不是最早 ===');
{
  // 先造一条很旧的，再造一条新的，应取新的
  const oldRec = maint.create({
    carId: 'car_1', key: 'coolant', date: '2020-01-01', mileage: 10000, cost: 300
  });
  const newRec = maint.create({
    carId: 'car_1', key: 'coolant', date: format.date(Date.now()), mileage: 48600, cost: 300
  });
  const board = maint.getBoard('car_1');
  const coolant = board.items.find(i => i.key === 'coolant');
  console.log(`  防冻液: 应取新记录 ${format.date(Date.now())}, 实际 ${format.date(coolant.lastDate)}`);
  check('取最近一次记录', format.date(coolant.lastDate), format.date(Date.now()));
  check('新记录里程正确', coolant.lastMileage, 48600);
  maint.remove(oldRec.id);
  maint.remove(newRec.id);
}

console.log('=== 场景 9：addMonths 月末溢出（用 tire 测试，mock 里无该记录冲突）===');
{
  // 轮胎换位周期 20000km / 24月
  // 2026-01-31 + 24 个月 = 2028-01-31（1 月有 31 天，不溢出）
  // 关键是要验证：不能滚到 2028-03
  const rec = maint.create({
    carId: 'car_2', key: 'tire', date: '2026-01-31', mileage: 21840, cost: 100
  });
  const board = maint.getBoard('car_2');
  const tire = board.items.find(i => i.key === 'tire');
  const d = new Date(tire.nextDate);
  console.log(`  2026-01-31 + 24个月 = ${format.date(tire.nextDate)}`);
  check('月份为 1 月（不溢出）', d.getMonth(), 0);
  check('日期为 31 日', d.getDate(), 31);
  check('年份为 2028', d.getFullYear(), 2028);
  maint.remove(rec.id);
}

console.log('=== 场景 9b：addMonths 月末边界（1/31 + 1个月 应回退到 2 月末）===');
{
  // 直接用内部逻辑验证：1 月 31 日加 1 个月，目标是 2 月，
  // 2 月只有 28 天（2027 非闰年），应得到 2 月 28 日而不是 3 月 3 日
  const { _addMonths } = require('../services/maintenance');
  if (_addMonths) {
    const base = new Date(2027, 0, 31).getTime(); // 2027-01-31
    const r1 = new Date(_addMonths(base, 1));
    console.log(`  2027-01-31 + 1个月 = ${r1.getFullYear()}-${r1.getMonth() + 1}-${r1.getDate()}`);
    check('月份为 2 月', r1.getMonth(), 1);
    check('日期回退到 28', r1.getDate(), 28);

    // 2027-08-31 + 6 个月 = 2028-02-29（2028 闰年）
    const base2 = new Date(2027, 7, 31).getTime();
    const r2 = new Date(_addMonths(base2, 6));
    console.log(`  2027-08-31 + 6个月 = ${r2.getFullYear()}-${r2.getMonth() + 1}-${r2.getDate()}`);
    check('月份为 2 月', r2.getMonth(), 1);
    check('闰年回退到 29', r2.getDate(), 29);
  } else {
    console.log('  (跳过：addMonths 未导出)');
  }
}

console.log('=== 场景 10：不存在的车辆不崩 ===');
{
  const board = maint.getBoard('not_exist');
  check('返回空 items', board.items.length, 0);
  check('返回空 counts', board.counts.overdue, 0);
}

console.log(`\n${'='.repeat(40)}`);
console.log(`通过 ${pass} 项，失败 ${fail} 项`);
process.exit(fail > 0 ? 1 : 0);
