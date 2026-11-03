const app = getApp();
const config = require('../../utils/config');
const carService = require('../../services/car');
const fuelLog = require('../../services/fuelLog');
const maintenance = require('../../services/maintenance');
const format = require('../../utils/format');
const ui = require('../../utils/ui');
const mock = require('../../mock/data');
const dashboard = require('../../services/dashboard');

Page({
  data: {
    statusBarHeight: 20,
    // 车辆
    car: null,
    cars: [],
    carSwitcherVisible: false,
    // 油耗仪表
    consumption: null,
    consumptionEmpty: true,
    trendText: '',
    trendClass: '',
    // 统计
    monthSpend: 0,
    totalKm: 0,
    costPerKm: null,
    recordCount: 0,
    // 保养提醒
    alerts: [],
    alertCount: 0,
    // 最近记录
    recent: [],
    // 提示
    tip: '',
    loaded: false
  },

  onLoad() {
    const sys = app.globalData.sysInfo || {};
    this.setData({ statusBarHeight: sys.statusBarHeight || 20 });
    // 随机一条用车小知识
    this.setData({ tip: mock.TIPS[Math.floor(Math.random() * mock.TIPS.length)] });
  },

  onShow() {
    this.refresh();
  },

  onPullDownRefresh() {
    this.refresh();
    wx.stopPullDownRefresh();
  },

  /* ================= 数据装载 ================= */

  refresh() {
    if (config.USE_REMOTE) {
      this.loadRemoteDashboard();
      return;
    }
    this.loadLocal();
  },

  loadLocal() {
    const cars = carService.getAll();
    const carId = app.getActiveCarId();
    const car = carService.getById(carId) || cars[0];

    if (!car) {
      this.setData({ loaded: true, cars });
      return;
    }

    // 确保 activeCarId 与真实车辆一致（防脏数据）
    if (car.id !== carId) {
      app.switchCar(car.id);
    }

    /* ------ 油耗与统计 ------ */
    const { asc, summary } = fuelLog.listWithConsumption(car.id);

    const latest = summary.latestConsumption;
    const trend = summary.trend;

    let trendText = '';
    let trendClass = '';
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

    /* ------ 保养提醒 ------ */
    const alerts = maintenance.getAlerts(car.id, 3).map((a) => ({
      ...a,
      // 展示文案
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

    /* ------ 最近 3 条记录 ------ */
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

    this.setData({
      car,
      cars,
      consumption: latest,
      consumptionEmpty: latest === null || latest === undefined,
      trendText,
      trendClass,
      monthSpend: +format.money(fuelLog.monthSpend(car.id)),
      totalKm: summary.totalKm,
      costPerKm: summary.costPerKm !== null ? format.fixed(summary.costPerKm, 2) : null,
      recordCount: summary.recordCount,
      alerts,
      alertCount: alerts.length,
      recent,
      loaded: true
    });
  },

  /* ================= 交互 ================= */

  onCarTap() {
    const cars = this.data.cars;
    if (cars.length <= 1) {
      wx.navigateTo({ url: '/pages/garage/garage' });
      return;
    }
    this.setData({ carSwitcherVisible: true });
  },

  onSwitchCar(e) {
    const id = e.currentTarget.dataset.id;
    app.switchCar(id);
    this.setData({ carSwitcherVisible: false });
    ui.tapFeedback();
    this.refresh();
  },

  onCloseSwitcher() {
    this.setData({ carSwitcherVisible: false });
  },

  /** 阻止弹层内点击冒泡到遮罩 */
  noop() {},

  onAddFuel() {
    wx.navigateTo({ url: '/pages/add/add?type=fuel' });
  },

  onAddMaintain() {
    wx.navigateTo({ url: '/pages/add/add?type=maintain' });
  },

  onGaugeTap() {
    wx.switchTab({ url: '/pages/stats/stats' });
  },

  onAlertTap() {
    wx.navigateTo({ url: '/pages/maintain/maintain' });
  },

  onGoRecords() {
    wx.switchTab({ url: '/pages/records/records' });
  },

  onRecordTap(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/add/add?id=${id}&type=fuel` });
  },

  onGoGarage() {
    wx.navigateTo({ url: '/pages/garage/garage' });
  },

  onGoMaintain() {
    wx.navigateTo({ url: '/pages/maintain/maintain' });
  },

  /* ================= 远程数据源 ================= */

  async loadRemoteDashboard() {
    try {
      const data = await dashboard.loadRemote();
      this.setData(data);
    } catch (e) {
      // 远程失败不崩页：提示并回退本地，保证还能用
      ui.toast((e && e.message) || '远程数据加载失败，已切回本地');
      this.loadLocal();
    }
  }
});
