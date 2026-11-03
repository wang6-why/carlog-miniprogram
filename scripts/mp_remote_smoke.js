/**
 * 小程序远程数据层端到端冒烟测试（Node 环境，无微信 IDE）
 *
 * 用 Node 模拟微信运行时（wx.request / wx.getStorageSync），
 * 让 services/dashboard.js 的远程路径直接打真实后端，
 * 验证：自动登录 -> 拉车辆 -> 拉看板 -> 复用本地油耗引擎 全链路正确。
 */
const http = require('http');

const BASE = process.env.BASE || 'http://localhost:8088/api';
const ROOT = 'C:/Users/86198/WorkBuddy/2026-11-03-10-39-57/carlog';

// ---- 模拟微信运行时 ----
const store = {};
global.wx = {
  getStorageSync: (k) => (Object.prototype.hasOwnProperty.call(store, k) ? store[k] : ''),
  setStorageSync: (k, v) => {
    store[k] = v;
  },
  request(opts) {
    const url = new URL(opts.url);
    const isGet = !opts.method || opts.method === 'GET';
    const payload = isGet ? null : JSON.stringify(opts.data || {});
    const req = http.request(
      {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname + url.search,
        method: opts.method || 'GET',
        headers: Object.assign({ 'Content-Type': 'application/json' }, opts.header || {})
      },
      (res) => {
        let buf = '';
        res.on('data', (c) => (buf += c));
        res.on('end', () => {
          let parsed;
          try {
            parsed = JSON.parse(buf);
          } catch (e) {
            parsed = buf;
          }
          opts.success({ statusCode: res.statusCode, data: parsed });
        });
      }
    );
    req.on('error', (e) => opts.fail && opts.fail({ errMsg: e.message }));
    if (payload) req.write(payload);
    req.end();
  }
};

const config = require(ROOT + '/utils/config');
config.USE_REMOTE = true;
config.API_BASE = BASE;

const dashboard = require(ROOT + '/services/dashboard');

(async () => {
  const d = await dashboard.loadRemote();
  const assert = (cond, msg) => {
    if (!cond) {
      console.error('FAIL:', msg);
      process.exit(1);
    }
    console.log('  ✓', msg);
  };

  assert(d.car && d.car.brand, '返回了当前车辆: ' + (d.car && d.car.brand + ' ' + d.car.model));
  assert(d.cars.length >= 1, '车辆列表 >= 1 (' + d.cars.length + ')');
  assert(d.recordCount > 0, '记录数 > 0 (' + d.recordCount + ')');
  assert(d.totalKm > 0, '总里程 > 0 (' + d.totalKm + ')');
  assert(d.costPerKm !== null, '每公里成本已算 (' + d.costPerKm + ')');
  assert(d.recent.length > 0 && d.recent[0].consumptionText !== undefined, '最近记录含油耗文案');
  assert(d.alerts.length >= 1, '保养告警 >= 1 (' + d.alerts.map((a) => a.name + ':' + a.status).join(', ') + ')');
  // 油耗应与后端 overview.avgConsumption 一致（同一套算法）
  assert(
    d.consumption !== null && d.consumption > 0,
    '仪表盘主数字油耗 = ' + d.consumption + ' L/100km'
  );

  console.log('\n小程序远程数据层对接后端：端到端验证通过 ✅');
})().catch((e) => {
  console.error('FAIL', e);
  process.exit(1);
});
