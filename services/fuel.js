/**
 * 油耗计算引擎
 *
 * ============ 为什么单独写一个文件 ============
 * 油耗算法是这个项目里唯一「算错了用户会失去信任」的地方。
 * 算差 0.3L/100km 用户可能发现不了，但把「加满法」和「非加满」混算，
 * 长期油耗会飘到离谱，那时候用户直接卸载。
 *
 * ============ 核心原则 ============
 * 油耗 = 加油量 / 行驶距离 × 100
 *
 * 但「加满法」有个关键前提：**只有两次「加满」之间的油量才可算**。
 * 因为非加满时，你不知道油箱里剩多少，也无法确定这次加进去的油
 * 对应的是哪一段路。业界标准做法（小熊油耗、汽车之家同款）：
 *
 *   找到相邻两次「加满」，把它们之间所有加油量加总，
 *   除以这两次满油之间的里程差，才是这段时间的真实油耗。
 *
 * 举例：
 *   加满 at 10000km  →  没记录油耗（不知道起点之前的情况）
 *   加 30L at 10400km（非满）
 *   加 40L at 10900km（加满）
 *   → 这一段油耗 = (30 + 40) / (10900 - 10000) × 100 = 7.78 L/100km
 *
 * 注意分母用「两次满油之间的里程差」，不是「所有加油里程之和」。
 */

/** 一次加油是否构成一个可计算的油耗区间终点 */
function canCompute(row, prevFull) {
  return !!prevFull && row.isFull === true;
}

/**
 * 计算每一条加油记录的「该段油耗」
 *
 * @param {Array} rows 加油记录，需已按 mileage 升序排列
 * @returns {Array} 在原数组基础上附加：
 *   - segmentLiters  该段累计加油量（含本次，不含起点满油）
 *   - segmentKm      该段行驶里程
 *   - consumption    该段油耗 L/100km（无法计算时为 null）
 *   - costPerKm      该段每公里油费（元）
 */
function calcConsumption(rows) {
  const list = rows
    .slice()
    .sort((a, b) => a.mileage - b.mileage || a.createdAt - b.createdAt);

  let prevFull = null; // 上一个「加满」记录
  let pendingLiters = 0; // 两次满油之间累积的油量
  let pendingCost = 0;

  const result = [];

  for (const row of list) {
    let consumption = null;
    let segmentKm = 0;
    let segmentLiters = 0;
    let costPerKm = null;

    // 只有本次加满且有上一个满油点，才能结算区间
    if (canCompute(row, prevFull)) {
      segmentKm = row.mileage - prevFull.mileage;
      segmentLiters = pendingLiters + row.liters;
      const segmentCost = pendingCost + row.amount;

      if (segmentKm > 0) {
        consumption = (segmentLiters / segmentKm) * 100;
        costPerKm = segmentCost / segmentKm;
      }

      // 结算完重置，下一次满油重新开始累积
      prevFull = row;
      pendingLiters = 0;
      pendingCost = 0;
    } else {
      // 没加满（或首个满油点），油量先累积着，等下一次满油一起结算
      if (row.isFull === true && !prevFull) {
        // 第一个满油点：作为起点，不结算，也不累积本次油量
        prevFull = row;
        pendingLiters = 0;
        pendingCost = 0;
      } else {
        pendingLiters += row.liters;
        pendingCost += row.amount;
      }
    }

    result.push({
      ...row,
      segmentKm,
      segmentLiters,
      consumption,
      costPerKm,
      // 记录这一条在时间序列中的位置，方便图表用
      isBaseline: row.isFull === true && consumption === null
    });
  }

  return result;
}

/**
 * 汇总统计
 *
 * @param {Array} rows 原始加油记录
 * @returns {Object} 汇总结果
 */
function summarize(rows) {
  const computed = calcConsumption(rows);
  const valid = computed.filter((r) => r.consumption !== null);

  // 总油耗：有效区间总油量 / 有效区间总里程
  // 注意不要用「各段油耗求平均」，那是错的（每段里程不同权重不同）
  const totalSegmentLiters = valid.reduce((s, r) => s + r.segmentLiters, 0);
  const totalSegmentKm = valid.reduce((s, r) => s + r.segmentKm, 0);
  const avgConsumption =
    totalSegmentKm > 0 ? (totalSegmentLiters / totalSegmentKm) * 100 : null;

  // 全部加油的总额（含第一笔基准油）
  const totalAmount = rows.reduce((s, r) => s + r.amount, 0);
  const totalLiters = rows.reduce((s, r) => s + r.liters, 0);

  // 总里程 = 最新里程 - 最早里程
  const sorted = rows.slice().sort((a, b) => a.mileage - b.mileage);
  const totalKm =
    sorted.length >= 2 ? sorted[sorted.length - 1].mileage - sorted[0].mileage : 0;

  // 最近一次油耗（用于仪表盘主数字）
  const latest = valid.length > 0 ? valid[valid.length - 1] : null;

  // 与上上次对比，算趋势
  let trend = null;
  if (valid.length >= 2) {
    const cur = valid[valid.length - 1].consumption;
    const prev = valid[valid.length - 2].consumption;
    trend = cur - prev;
  }

  return {
    computed, // 带每段油耗的完整列表（升序）
    avgConsumption,
    latestConsumption: latest ? latest.consumption : null,
    latestRecord: latest,
    trend, // 正数=油耗上升（变费油），负数=下降
    totalAmount,
    totalLiters,
    totalKm,
    recordCount: rows.length,
    // 每公里花费
    costPerKm: totalKm > 0 ? totalAmount / totalKm : null
  };
}

/**
 * 按月份聚合，用于柱状图
 *
 * @param {Array} rows 原始加油记录
 * @returns {Array} [{ ym: '2026-11', label: '11月', amount, liters, km }]
 */
function groupByMonth(rows, monthCount = 6) {
  const map = new Map();

  for (const r of rows) {
    const d = new Date(r.createdAt);
    const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (!map.has(ym)) {
      map.set(ym, { ym, label: `${d.getMonth() + 1}月`, amount: 0, liters: 0, count: 0 });
    }
    const m = map.get(ym);
    m.amount += r.amount;
    m.liters += r.liters;
    m.count += 1;
  }

  const list = Array.from(map.values()).sort((a, b) => (a.ym < b.ym ? -1 : 1));

  // 补齐空月份，图表才不会跳格
  const filled = [];
  const now = new Date();
  for (let i = monthCount - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const found = list.find((x) => x.ym === ym);
    filled.push(
      found || {
        ym,
        label: `${d.getMonth() + 1}月`,
        amount: 0,
        liters: 0,
        count: 0
      }
    );
  }

  return filled;
}

module.exports = {
  calcConsumption,
  summarize,
  groupByMonth
};
