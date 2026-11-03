/**
 * 统一网络请求封装（小程序版）
 *
 * 约定和后端一致：后端返回 { code, message, data }，code=0 为成功。
 * 这里把 data 直接 resolve 出来，业务代码拿到的就是纯数据。
 * 失败（网络 / 非 2xx / code!=0 / 401）统一 reject 出可读的错误信息。
 */

const config = require('./config');
const storage = require('./storage');

function request(options) {
  return new Promise((resolve, reject) => {
    const token = storage.get(config.TOKEN_KEY);
    const header = { 'Content-Type': 'application/json' };
    if (options.header) Object.assign(header, options.header);
    if (token) header.Authorization = 'Bearer ' + token;

    wx.request({
      url: config.API_BASE + options.url,
      method: options.method || 'GET',
      data: options.data || {},
      header,
      success(res) {
        const body = res.data;

        if (res.statusCode === 401) {
          storage.remove(config.TOKEN_KEY);
          reject(new Error((body && body.message) || '登录已过期，请重新登录'));
          return;
        }
        if (res.statusCode < 200 || res.statusCode >= 300) {
          reject(new Error((body && body.message) || '请求失败（' + res.statusCode + '）'));
          return;
        }
        if (body && typeof body.code === 'number') {
          if (body.code === 0) resolve(body.data);
          else reject(new Error(body.message || '业务处理失败'));
        } else {
          // 非标准结构（理论上不会走到）原样返回
          resolve(body);
        }
      },
      fail(err) {
        reject(new Error((err && err.errMsg) || '网络请求失败'));
      }
    });
  });
}

module.exports = request;
