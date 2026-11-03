/**
 * UI 交互封装
 * 统一 toast / loading / 确认框，避免各页面写重复代码，
 * 也保证深色主题下的视觉一致性（小程序原生弹窗是白底，会破坏深色观感）。
 */

function toast(title, icon = 'none') {
  wx.showToast({ title: String(title), icon, duration: 1800, mask: false });
}

function success(title) {
  wx.showToast({ title: String(title), icon: 'success', duration: 1500 });
}

/** 自动判断成功/失败 */
function result(ok, okText, failText) {
  if (ok) success(okText || '完成');
  else toast(failText || '操作失败');
}

let loadingCount = 0;

function loading(title = '加载中') {
  loadingCount += 1;
  wx.showLoading({ title, mask: true });
}

function hideLoading() {
  loadingCount = Math.max(0, loadingCount - 1);
  if (loadingCount === 0) wx.hideLoading();
}

function confirm(content, title = '确认') {
  return new Promise((resolve) => {
    wx.showModal({
      title,
      content,
      confirmColor: '#00D4FF',
      cancelColor: '#A8B4C2',
      success: (res) => resolve(!!res.confirm),
      fail: () => resolve(false)
    });
  });
}

/** 危险操作确认（红字） */
function confirmDanger(content, title = '请确认') {
  return new Promise((resolve) => {
    wx.showModal({
      title,
      content,
      confirmText: '删除',
      confirmColor: '#FF3B5C',
      cancelColor: '#A8B4C2',
      success: (res) => resolve(!!res.confirm),
      fail: () => resolve(false)
    });
  });
}

/** 底部选择器，返回 Promise<index|null> */
function actionSheet(itemList, title) {
  return new Promise((resolve) => {
    wx.showActionSheet({
      itemList,
      itemColor: '#F2F6FA',
      success: (res) => resolve(res.tapIndex),
      fail: () => resolve(null)
    });
  });
}

function vibrate(type = 'short') {
  try {
    if (type === 'long') wx.vibrateLong();
    else wx.vibrateShort({ type: 'light' });
  } catch (e) {
    // 部分机型不支持，忽略
  }
}

/** 点击反馈小动画，配合 .btn:active 使用 */
function tapFeedback() {
  vibrate('short');
}

module.exports = {
  toast,
  success,
  result,
  loading,
  hideLoading,
  confirm,
  confirmDanger,
  actionSheet,
  vibrate,
  tapFeedback
};
