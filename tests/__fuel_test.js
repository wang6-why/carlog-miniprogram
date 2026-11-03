const { calcConsumption, summarize, groupByMonth } = require('../services/fuel');

let pass = 0, fail = 0;
function check(name, actual, expected, tolerance = 0.01) {
  const ok = typeof expected === 'number'
    ? Math.abs(actual - expected) <= tolerance
    : actual === expected;
  if (ok) { pass++; console.log(`  ✓ ${name}`); }
  else { fail++; console.log(`  ✗ ${name}\n      期望: ${expected}\n      实际: ${actual}`); }
}

function rec(mileage, liters, isFull, day, price = 7.5) {
  return {
    mileage, liters, isFull, price,
    amount: +(liters * price).toFixed(2),
    createdAt: new Date(2026, 9, day).getTime()
  };
}

console.log('\n=== 场景 1：标准加满法（两次满油之间夹一次非满）===');
// 加满 10000 → 非满 30L @10400 → 加满 40L @10900
// 期望: (30+40)/900*100 = 7.78
{
  const rows = [rec(10000, 45, true, 1), rec(10400, 30, false, 10), rec(10900, 40, true, 20)];
  const r = calcConsumption(rows);
  check('第1条无油耗（起点）', r[0].consumption, null);
  check('第2条无油耗（非满未结算）', r[1].consumption, null);
  check('第3条油耗 = (30+40)/900*100', +r[2].consumption.toFixed(2), 7.78);
  check('第3条区间里程 = 900', r[2].segmentKm, 900);
  check('第3条区间油量 = 70', r[2].segmentLiters, 70);
}

console.log('\n=== 场景 2：连续加满（最常见）===');
// 加满 10000 → 加满 40L @10500 => 40/500*100 = 8.0
{
  const rows = [rec(10000, 45, true, 1), rec(10500, 40, true, 15)];
  const r = calcConsumption(rows);
  check('第2条油耗 = 40/500*100', +r[1].consumption.toFixed(2), 8.0);
}

console.log('\n=== 场景 3：三次连续加满，逐段应各自独立 ===');
{
  const rows = [
    rec(10000, 45, true, 1),
    rec(10500, 40, true, 15),   // 40/500*100 = 8.0
    rec(11100, 42, true, 30),   // 42/600*100 = 7.0
  ];
  const r = calcConsumption(rows);
  check('第2条 = 8.0', +r[1].consumption.toFixed(2), 8.0);
  check('第3条 = 7.0', +r[2].consumption.toFixed(2), 7.0);
}

console.log('\n=== 场景 4：全部非满，应全部无法计算 ===');
{
  const rows = [rec(10000, 20, false, 1), rec(10300, 20, false, 10)];
  const r = calcConsumption(rows);
  check('无任何油耗可算', r.every(x => x.consumption === null), true);
}

console.log('\n=== 场景 5：乱序输入，必须先排序再算 ===');
{
  // 故意打乱：11000 在前面，10000 在后面
  const rows = [rec(11100, 42, true, 30), rec(10000, 45, true, 1), rec(10500, 40, true, 15)];
  const r = calcConsumption(rows);
  check('第1条（10000，起点）无油耗', r[0].consumption, null);
  check('第2条（10500）= 8.0', +r[1].consumption.toFixed(2), 8.0);
  check('第3条（11100）= 7.0', +r[2].consumption.toFixed(2), 7.0);
}

console.log('\n=== 场景 6：汇总统计（加权而非算术平均）===');
{
  // 段1: 40L/500km = 8.0 ; 段2: 42L/600km = 7.0
  // 加权: (40+42)/(500+600)*100 = 7.4545...
  // 错误的算术平均会得到 7.5
  const rows = [
    rec(10000, 45, true, 1),
    rec(10500, 40, true, 15),
    rec(11100, 42, true, 30),
  ];
  const s = summarize(rows);
  check('加权油耗 = 82/1100*100', +s.avgConsumption.toFixed(4), 7.4545, 0.001);
  check('不是算术平均 7.5', Math.abs(s.avgConsumption - 7.5) > 0.01, true);
  check('总里程 = 1100', s.totalKm, 1100);
  check('最近油耗 = 7.0', +s.latestConsumption.toFixed(2), 7.0);
  check('趋势 = 7.0 - 8.0 = -1.0', +s.trend.toFixed(2), -1.0);
  check('记录数 = 3', s.recordCount, 3);
}

console.log('\n=== 场景 7：单条记录不崩 ===');
{
  const s = summarize([rec(10000, 45, true, 1)]);
  check('单条时平均油耗为 null', s.avgConsumption, null);
  check('单条时总里程 = 0', s.totalKm, 0);
  check('单条时 costPerKm 为 null', s.costPerKm, null);
}

console.log('\n=== 场景 8：空数组不崩 ===');
{
  const s = summarize([]);
  check('空数组平均油耗为 null', s.avgConsumption, null);
  check('空数组记录数 = 0', s.recordCount, 0);
  check('空数组趋势为 null', s.trend, null);
}

console.log('\n=== 场景 9：里程为 0 的异常数据（同里程两次加油）===');
{
  const rows = [rec(10000, 45, true, 1), rec(10000, 40, true, 2)];
  const r = calcConsumption(rows);
  check('同里程时油耗为 null 而不是 Infinity', r[1].consumption, null);
}

console.log('\n=== 场景 10：按月聚合 ===');
{
  const now = new Date();
  const rows = [
    { mileage: 10000, liters: 40, isFull: true, price: 7.5, amount: 300, createdAt: now.getTime() },
    { mileage: 10500, liters: 40, isFull: true, price: 7.5, amount: 300, createdAt: now.getTime() },
  ];
  const m = groupByMonth(rows, 6);
  check('返回 6 个月', m.length, 6);
  check('最后一个月是本月', m[5].label, `${now.getMonth() + 1}月`);
  check('本月金额 = 600', m[5].amount, 600);
}

console.log(`\n${'='.repeat(40)}`);
console.log(`通过 ${pass} 项，失败 ${fail} 项`);
process.exit(fail > 0 ? 1 : 0);
