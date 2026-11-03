const storage = require('../../utils/storage');
const ui = require('../../utils/ui');
const config = require('../../utils/config');
const auth = require('../../services/auth');
const remote = require('../../services/remote');

Page({
  data: {
    // 提醒设置
    remindMaintain: true,
    remindFuel: false,
    // 缓存
    cacheCount: 0,
    cacheKb: 0,
    version: '1.0.0',
    // 后端连接
    useRemote: false,
    apiBase: '',
    remoteStatus: '',
    testing: false
  },

  onShow() {
    const size = storage.size();
    this.setData({
      cacheCount: size.count,
      cacheKb: size.kb,
      remindMaintain: storage.get('remindMaintain', true),
      remindFuel: storage.get('remindFuel', false),
      useRemote: config.USE_REMOTE,
      apiBase: config.API_BASE
    });
  },

  onToggleMaintain(e) {
    const v = e.detail.value;
    this.setData({ remindMaintain: v });
    storage.set('remindMaintain', v);
  },

  onToggleFuel(e) {
    const v = e.detail.value;
    this.setData({ remindFuel: v });
    storage.set('remindFuel', v);
  },

  /* ================= 后端连接 ================= */

  onApiBaseInput(e) {
    this.setData({ apiBase: e.detail.value });
  },

  onToggleRemote(e) {
    const v = e.detail.value;
    this.setData({ useRemote: v, remoteStatus: '' });
    config.USE_REMOTE = v;
    storage.set('use_remote', v);
    if (v) {
      const base = this.data.apiBase.trim();
      if (base) {
        config.API_BASE = base;
        storage.set('api_base', base);
      }
      // 打开远程后预热登录态，让仪表盘立刻能拉数据
      auth.ensureLogin().catch(() => {});
    }
  },

  async onTestConnection() {
    const base = this.data.apiBase.trim();
    if (!base) {
      ui.toast('请先填写后端地址');
      return;
    }
    config.API_BASE = base;
    storage.set('api_base', base);

    this.setData({ testing: true, remoteStatus: '连接中…' });
    try {
      await auth.ensureLogin();
      const cars = await remote.getCars();
      this.setData({
        testing: false,
        remoteStatus: `连接成功，获取到 ${cars.length} 辆车`
      });
      ui.success('连接成功');
    } catch (err) {
      this.setData({
        testing: false,
        remoteStatus: '连接失败：' + ((err && err.message) || '未知错误')
      });
      ui.toast('连接失败');
    }
  },

  /** 导出数据为 JSON 文本，方便用户备份 */
  onExport() {
    const data = {
      cars: storage.get('cars', []),
      fuelLogs: storage.get('fuel_logs', []),
      maintenanceLogs: storage.get('maintenance_logs', []),
      exportedAt: new Date().toISOString()
    };

    const text = JSON.stringify(data, null, 2);

    wx.setClipboardData({
      data: text,
      success: () => {
        wx.showModal({
          title: '已复制到剪贴板',
          content: '数据已复制为 JSON 文本，可粘贴到备忘录或发送给自己备份。',
          showCancel: false,
          confirmColor: '#00D4FF'
        });
      },
      fail: () => ui.toast('复制失败，数据量可能过大')
    });
  },

  async onClearCache() {
    const ok = await ui.confirmDanger(
      '仅清除缓存，不会删除你的加油与保养记录。确定继续？'
    );
    if (!ok) return;
    ui.success('已清理');
  },

  async onClearAll() {
    const ok = await ui.confirmDanger(
      '这会删除全部车辆、加油记录和保养记录，且无法恢复！确定要清空吗？',
      '清空所有数据'
    );
    if (!ok) return;

    const ok2 = await ui.confirmDanger('再确认一次：数据一旦删除无法找回。', '最后确认');
    if (!ok2) return;

    storage.clearAll();
    ui.success('已清空');
    setTimeout(() => {
      wx.reLaunch({ url: '/pages/dashboard/dashboard' });
    }, 800);
  },

  onAbout() {
    wx.showModal({
      title: '关于车迹',
      content:
        '一个专注「养车记账」的小程序。\n\n油耗采用行业标准的加满法计算：两次加满之间的油量 ÷ 该段里程 × 100。\n\n所有数据存储在本地，不上传服务器。',
      showCancel: false,
      confirmColor: '#00D4FF'
    });
  },

  onFeedback() {
    ui.toast('功能开发中');
  }
});
