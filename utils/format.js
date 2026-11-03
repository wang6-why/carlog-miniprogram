/**
 * 格式化工具
 * 这个项目里数字格式化格外重要 —— 仪表盘上全是数字，
 * 小数点位数不统一会显得很业余。
 */

/** 保留 n 位小数，返回字符串（不补零） */
function fixed(num, n = 1) {
  if (num === null || num === undefined || isNaN(num)) return '--';
  const v = Number(num);
  // toFixed 后会补零，去掉末尾无意义的 0（7.50 -> 7.5，8.00 -> 8）
  return String(Number(v.toFixed(n)));
}

/** 保留 n 位小数，强制补零（数值对齐用，如 7.50） */
function fixedPad(num, n = 2) {
  if (num === null || num === undefined || isNaN(num)) return '--';
  return Number(num).toFixed(n);
}

/** 金额：整数不带小数，有角分才保留两位 */
function money(num) {
  if (num === null || num === undefined || isNaN(num)) return '0';
  const v = Number(num);
  if (Number.isInteger(v)) return String(v);
  return v.toFixed(2);
}

/** 千分位，用于大额里程 */
function thousands(num) {
  if (num === null || num === undefined || isNaN(num)) return '--';
  return String(Math.round(Number(num))).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/** 日期 YYYY-MM-DD */
function date(ts) {
  if (!ts) return '--';
  const d = new Date(ts);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** MM-DD */
function monthDay(ts) {
  if (!ts) return '--';
  const d = new Date(ts);
  const p = (n) => String(n).padStart(2, '0');
  return `${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** YYYY-MM-DD HH:mm */
function dateTime(ts) {
  if (!ts) return '--';
  const d = new Date(ts);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** 今天 00:00 的时间戳 */
function todayStart() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** 相对日期：今天 / 昨天 / 3 天前 / 具体日期 */
function fromNow(ts) {
  if (!ts) return '--';
  const diff = todayStart() - new Date(ts).setHours(0, 0, 0, 0);
  const days = Math.round(diff / 86400000);
  if (days === 0) return '今天';
  if (days === 1) return '昨天';
  if (days === 2) return '前天';
  if (days > 2 && days <= 30) return `${days}天前`;
  return date(ts);
}

/** 天数差：target - today，正数表示还有几天 */
function daysUntil(ts) {
  if (!ts) return null;
  const target = new Date(ts).setHours(0, 0, 0, 0);
  return Math.round((target - todayStart()) / 86400000);
}

/** 把时间戳转成 date picker 需要的 YYYY-MM-DD */
function toPickerDate(ts) {
  return date(ts || Date.now());
}

/**
 * 解析 'YYYY-MM-DD' 或 'YYYY-MM-DDTHH:mm:ss' 为本地时间戳
 *
 * 为什么要自己写：
 *   new Date('2026-01-31') 会被当作 UTC 午夜，在东八区变成 08:00，
 *   跨月计算天数时会差 1 天；而 new Date('2026-01-31T00:00:00') 才是本地时间。
 *   全项目日期字符串都走这个函数，避免时区带来的「差一天」问题。
 */
function parseDate(str) {
  if (!str) return Date.now();
  if (typeof str === 'number') return str;
  const s = String(str);
  // 纯日期 YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [y, m, d] = s.split('-').map(Number);
    return new Date(y, m - 1, d, 0, 0, 0, 0).getTime();
  }
  // 带时间的字符串（含 +08:00 时区偏移），Date 能正确处理
  const t = new Date(s).getTime();
  return isNaN(t) ? Date.now() : t;
}

/** date picker 返回值转时间戳（中午 12 点，避免跨时区时算成前一天） */
function fromPickerDate(str) {
  if (!str) return Date.now();
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d, 12, 0, 0).getTime();
}

/** 安全转数字，失败返回 fallback */
function num(v, fallback = 0) {
  const n = parseFloat(v);
  return isNaN(n) ? fallback : n;
}

module.exports = {
  fixed,
  fixedPad,
  money,
  thousands,
  date,
  monthDay,
  dateTime,
  todayStart,
  fromNow,
  daysUntil,
  toPickerDate,
  fromPickerDate,
  parseDate,
  num
};
