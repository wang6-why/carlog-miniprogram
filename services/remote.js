/**
 * 后端接口封装
 *
 * 与 Spring Boot 那套 controller 路径一一对应：
 *   /auth/login           登录
 *   /cars                车辆 CRUD
 *   /fuel-logs           加油记录 CRUD（?carId= 过滤）
 *   /maintenance/logs    保养记录 CRUD
 *   /maintenance/templates  保养周期模板
 *   /dashboard/overview/{carId}  看板汇总（含保养告警）
 *   /dashboard/monthly/{carId}   月度支出
 *
 * 每个函数都返回 Promise，resolve 的是后端 R.data 里的纯数据。
 * 字段命名沿用后端驼峰（如 modelYear、isFull、totalAmount）。
 */

const request = require('../utils/request');

module.exports = {
  // ---------- 认证 ----------
  login: (username, password) =>
    request({ url: '/auth/login', method: 'POST', data: { username, password } }),

  me: () => request({ url: '/auth/me' }),

  // ---------- 车辆 ----------
  getCars: () => request({ url: '/cars' }),
  createCar: (data) => request({ url: '/cars', method: 'POST', data }),
  updateCar: (id, data) => request({ url: `/cars/${id}`, method: 'PUT', data }),
  deleteCar: (id) => request({ url: `/cars/${id}`, method: 'DELETE' }),

  // ---------- 加油 ----------
  getFuelLogs: (carId) => request({ url: '/fuel-logs', data: { carId } }),
  createFuelLog: (data) => request({ url: '/fuel-logs', method: 'POST', data }),
  updateFuelLog: (id, data) => request({ url: `/fuel-logs/${id}`, method: 'PUT', data }),
  deleteFuelLog: (id) => request({ url: `/fuel-logs/${id}`, method: 'DELETE' }),

  // ---------- 保养 ----------
  getMaintTemplates: () => request({ url: '/maintenance/templates' }),
  getMaintLogs: (carId) => request({ url: '/maintenance/logs', data: { carId } }),
  createMaintLog: (data) => request({ url: '/maintenance/logs', method: 'POST', data }),
  updateMaintLog: (id, data) => request({ url: `/maintenance/logs/${id}`, method: 'PUT', data }),
  deleteMaintLog: (id) => request({ url: `/maintenance/logs/${id}`, method: 'DELETE' }),

  // ---------- 看板 ----------
  getOverview: (carId) => request({ url: `/dashboard/overview/${carId}` }),
  getMonthly: (carId, months) =>
    request({ url: `/dashboard/monthly/${carId}`, data: { months } })
};
