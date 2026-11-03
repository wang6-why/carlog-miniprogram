/**
 * 登录态管理（小程序端）
 *
 * 真机调试时，后端在电脑上、小程序在手机上，二者不在同一台机器，
 * 所以用「自动登录演示账号」的方式快速拿到 token，省去在小程序里写登录页的麻烦。
 * 正式接入自己的账号体系时，把 ensureLogin 换成你自己的登录流程即可。
 */

const config = require('../utils/config');
const storage = require('../utils/storage');
const remote = require('./remote');

function getToken() {
  return storage.get(config.TOKEN_KEY);
}

function setToken(token) {
  storage.set(config.TOKEN_KEY, token);
}

function logout() {
  storage.remove(config.TOKEN_KEY);
}

async function login(username, password) {
  const data = await remote.login(username, password);
  setToken(data.token);
  return data;
}

/** 确保有可用 token：没有就自动用演示账号登录 */
async function ensureLogin() {
  if (getToken()) return;
  await login(config.DEMO_USER, config.DEMO_PASS);
}

module.exports = { getToken, setToken, logout, login, ensureLogin };
