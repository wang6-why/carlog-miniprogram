const app = getApp();
const carService = require('../../services/car');
const fuelLog = require('../../services/fuelLog');
const maintenance = require('../../services/maintenance');
const format = require('../../utils/format');

Page({
  data: {
    car: null,
    // 汇总数据
    stats: {
      cars: 0,
      records: 0,
      maintainRecords: 0,
      totalCost: '0',
      totalKm: '0',
      avgConsumption: '--'
    },
    alerts: 0,
    loaded: false
  },

  onShow() {
    this.refresh();
  },

  refresh() {
    const carId = app.getActiveCarId();
    const car = carService.getById(carId);
    const cars = carService.getAll();

    const { summary } = fuelLog.listWithConsumption(carId);
    const maintLogs = maintenance.listByCar(carId);
    const maintCost = maintLogs.reduce((s, m) => s + (Number(m.cost) || 0), 0);
    const board = maintenance.getBoard(carId);

    this.setData({
      car,
      stats: {
        cars: cars.length,
        records: summary.recordCount,
        maintainRecords: maintLogs.length,
        totalCost: format.money(summary.totalAmount + maintCost),
        totalKm: format.thousands(summary.totalKm),
        avgConsumption:
          summary.avgConsumption !== null ? format.fixed(summary.avgConsumption, 2) : '--'
      },
      alerts: board.counts.overdue + board.counts.soon,
      loaded: true
    });
  },

  onGoGarage() {
    wx.navigateTo({ url: '/pages/garage/garage' });
  },

  onGoMaintain() {
    wx.navigateTo({ url: '/pages/maintain/maintain' });
  },

  onGoStats() {
    wx.switchTab({ url: '/pages/stats/stats' });
  },

  onGoRecords() {
    wx.switchTab({ url: '/pages/records/records' });
  },

  onGoSettings() {
    wx.navigateTo({ url: '/pages/settings/settings' });
  },

  onAddCar() {
    wx.navigateTo({ url: '/pages/garage/garage' });
  }
});
