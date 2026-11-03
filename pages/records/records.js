const app = getApp();
const carService = require('../../services/car');
const fuelLog = require('../../services/fuelLog');
const format = require('../../utils/format');
const ui = require('../../utils/ui');

Page({
  data: {
    car: null,
    all: [],
    list: [],
    summary: null,
    totalLitersText: '0',
    totalAmountText: '0',
    filter: 'all', // all | full | partial
    filteredTotal: 0,
    loaded: false
  },

  onShow() {
    this.refresh();
  },

  onPullDownRefresh() {
    this.refresh();
    wx.stopPullDownRefresh();
  },

  refresh() {
    const carId = app.getActiveCarId();
    const car = carService.getById(carId);
    const { asc, summary } = fuelLog.listWithConsumption(carId);

    const all = asc
      .slice()
      .reverse()
      .map((r) => ({
        ...r,
        dateText: format.date(r.createdAt),
        weekday: ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][
          new Date(r.createdAt).getDay()
        ],
        amountText: format.money(r.amount),
        litersText: format.fixed(r.liters, 2),
        priceText: format.fixed(r.price, 2),
        mileageText: format.thousands(r.mileage),
        consumptionText: r.consumption !== null ? format.fixed(r.consumption, 2) : '',
        costPerKmText: r.costPerKm !== null ? format.fixed(r.costPerKm, 2) : '',
        hasConsumption: r.consumption !== null
      }));

    this.setData({
      car,
      all,
      summary,
      totalLitersText: summary ? format.fixed(summary.totalLiters, 1) : '0',
      totalAmountText: summary ? format.money(summary.totalAmount) : '0',
      loaded: true
    });

    this.applyFilter();
  },

  applyFilter() {
    const { all, filter } = this.data;
    let list = all;
    if (filter === 'full') list = all.filter((r) => r.isFull);
    else if (filter === 'partial') list = all.filter((r) => !r.isFull);

    this.setData({
      list,
      filteredTotal: list.reduce((s, r) => s + r.amount, 0)
    });
  },

  onFilterTap(e) {
    const filter = e.currentTarget.dataset.filter;
    this.setData({ filter }, () => this.applyFilter());
    ui.tapFeedback();
  },

  onItemTap(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/add/add?id=${id}&type=fuel` });
  },

  onAdd() {
    wx.navigateTo({ url: '/pages/add/add?type=fuel' });
  },

  /** 长按删除 */
  async onItemLongPress(e) {
    const id = e.currentTarget.dataset.id;
    const ok = await ui.confirmDanger('删除后油耗会重新计算，确定删除这条记录？');
    if (!ok) return;
    fuelLog.remove(id);
    ui.success('已删除');
    this.refresh();
  }
});
