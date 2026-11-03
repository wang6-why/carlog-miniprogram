const storage = require('./utils/storage');

App({
  globalData: {
    // 当前选中的车辆 id（多车支持）
    activeCarId: null,
    // 系统信息缓存
    sysInfo: null,
    // 单位偏好
    unit: 'L/100km'
  },

  onLaunch() {
    // 预热系统信息，避免各页面重复同步调用
    try {
      this.globalData.sysInfo = wx.getWindowInfo
        ? wx.getWindowInfo()
        : wx.getSystemInfoSync();
    } catch (e) {
      this.globalData.sysInfo = { windowWidth: 375, statusBarHeight: 20 };
    }

    // 恢复上次选中的车辆
    const savedCar = storage.get('activeCarId');
    this.globalData.activeCarId = savedCar || 'car_1';

    // 首次使用给个引导标记
    if (!storage.get('onboarded')) {
      storage.set('onboarded', true);
    }
  },

  onShow() {
    // 每次回到前台刷新一下当前车辆，避免数据不一致
    const savedCar = storage.get('activeCarId');
    if (savedCar) this.globalData.activeCarId = savedCar;
  },

  /** 切换当前车辆，并通知监听者 */
  switchCar(carId) {
    this.globalData.activeCarId = carId;
    storage.set('activeCarId', carId);
  },

  getActiveCarId() {
    return this.globalData.activeCarId || 'car_1';
  }
});
