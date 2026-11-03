const app = getApp();
const carService = require('../../services/car');
const maintenance = require('../../services/maintenance');
const format = require('../../utils/format');
const ui = require('../../utils/ui');

Page({
  data: {
    car: null,
    items: [],
    counts: { overdue: 0, soon: 0, normal: 0, unknown: 0 },
    logs: [],
    tab: 'board', // board | history
    loaded: false
  },

  onShow() {
    this.refresh();
  },

  refresh() {
    const carId = app.getActiveCarId();
    const car = carService.getById(carId);
    const board = maintenance.getBoard(carId);

    const items = board.items.map((it) => ({
      ...it,
      // 展示用的两个剩余量
      kmText:
        it.remainKm !== null
          ? it.remainKm >= 0
            ? `${it.remainKm}km`
            : `超 ${Math.abs(it.remainKm)}km`
          : '--',
      dayText:
        it.remainDays !== null
          ? it.remainDays >= 0
            ? `${it.remainDays}天`
            : `超 ${Math.abs(it.remainDays)}天`
          : '--',
      kmWarn: it.remainKm !== null && it.remainKm <= 0,
      dayWarn: it.remainDays !== null && it.remainDays <= 0,
      lastDateText: it.lastDate ? format.date(it.lastDate) : '无记录',
      nextDateText: it.nextDate ? format.date(it.nextDate) : '--',
      nextMileageText: it.nextMileage !== null ? format.thousands(it.nextMileage) : '--',
      barWidth: Math.min(100, Math.max(2, it.percent)),
      barClass:
        it.status === 'overdue'
          ? 'bg-red'
          : it.status === 'soon'
          ? 'bg-amber'
          : it.status === 'unknown'
          ? 'bg-grey'
          : 'bg-green'
    }));

    const logs = maintenance.listByCar(carId).map((l) => ({
      ...l,
      dateText: format.date(l.date),
      costText: l.cost ? format.money(l.cost) : '',
      mileageText: format.thousands(l.mileage)
    }));

    this.setData({
      car,
      items,
      counts: board.counts,
      logs,
      loaded: true
    });
  },

  onTabTap(e) {
    this.setData({ tab: e.currentTarget.dataset.tab });
    ui.tapFeedback();
  },

  onAdd() {
    wx.navigateTo({ url: '/pages/add/add?type=maintain' });
  },

  /** 点某个项目直接记保养，自动选中该项目 */
  onItemTap(e) {
    const key = e.currentTarget.dataset.key;
    wx.navigateTo({ url: `/pages/add/add?type=maintain&preset=${key}` });
  },

  onLogTap(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/add/add?id=${id}&type=maintain` });
  },

  async onLogLongPress(e) {
    const id = e.currentTarget.dataset.id;
    const ok = await ui.confirmDanger('确定删除这条保养记录？删除后提醒会重新计算。');
    if (!ok) return;
    maintenance.remove(id);
    ui.success('已删除');
    this.refresh();
  }
});
