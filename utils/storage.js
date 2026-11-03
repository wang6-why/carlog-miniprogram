/**
 * Storage 封装
 * 统一加前缀，避免与其它小程序数据冲突；读失败时返回默认值而不是抛错。
 */

const PREFIX = 'carlog_';

function key(k) {
  return PREFIX + k;
}

function get(k, fallback = null) {
  try {
    const v = wx.getStorageSync(key(k));
    return v === '' || v === undefined ? fallback : v;
  } catch (e) {
    return fallback;
  }
}

function set(k, v) {
  try {
    wx.setStorageSync(key(k), v);
    return true;
  } catch (e) {
    return false;
  }
}

function remove(k) {
  try {
    wx.removeStorageSync(key(k));
    return true;
  } catch (e) {
    return false;
  }
}

/** 清空本小程序所有数据（设置页「清除数据」用） */
function clearAll() {
  try {
    const info = wx.getStorageInfoSync();
    info.keys
      .filter((k) => k.indexOf(PREFIX) === 0)
      .forEach((k) => wx.removeStorageSync(k));
    return true;
  } catch (e) {
    return false;
  }
}

/** 统计本小程序占用空间，给设置页展示 */
function size() {
  try {
    const info = wx.getStorageInfoSync();
    let count = 0;
    let bytes = 0;
    info.keys
      .filter((k) => k.indexOf(PREFIX) === 0)
      .forEach((k) => {
        count += 1;
        const raw = wx.getStorageSync(k);
        bytes += JSON.stringify(raw || '').length;
      });
    return { count, kb: Math.max(1, Math.round(bytes / 1024)) };
  } catch (e) {
    return { count: 0, kb: 0 };
  }
}

module.exports = { get, set, remove, clearAll, size };
