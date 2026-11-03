#!/usr/bin/env node
/**
 * 小程序静态校验脚本
 *
 * 微信开发者工具只在「编译时」报错，而且经常一次只报一个。
 * 这个脚本把最容易出错的几类问题一次性全部列出来，CI 里跑一遍能省很多来回。
 *
 * 检查项：
 *   1. 所有 .json 文件是否合法
 *   2. app.json 里注册的每个页面，四件套（js/wxml/wxss/json）是否齐全
 *   3. tabBar 配置的图标文件是否存在
 *   4. page.json 中 usingComponents 指向的组件文件是否存在
 *   5. js 文件里的 require('./xxx') 相对路径是否真实存在
 *   6. wxml 里 bindtap="foo" 绑定的方法，是否在对应 js 中有定义
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const errors = [];
const warnings = [];

/* ---------------- 工具 ---------------- */

function walk(dir, out = []) {
  for (const name of fs.readdirSync(dir)) {
    if (name === 'node_modules' || name === '.git') continue;
    const full = path.join(dir, name);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

function readJSON(file) {
  const raw = fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''); // 去掉 BOM，Windows 下很常见
  return JSON.parse(raw);
}

function rel(file) {
  return path.relative(ROOT, file).replace(/\\/g, '/');
}

/* ---------------- 1. JSON 合法性 ---------------- */

const allFiles = walk(ROOT);
const jsonFiles = allFiles.filter((f) => f.endsWith('.json'));

for (const file of jsonFiles) {
  try {
    readJSON(file);
  } catch (e) {
    errors.push(`JSON 语法错误: ${rel(file)}\n    ${e.message}`);
  }
}

/* ---------------- 2. 页面四件套 ---------------- */

const EXTS = ['js', 'wxml', 'wxss', 'json'];
let appConfig = null;

try {
  appConfig = readJSON(path.join(ROOT, 'app.json'));
} catch (e) {
  errors.push(`app.json 无法解析: ${e.message}`);
}

if (appConfig) {
  const pages = appConfig.pages || [];
  if (pages.length === 0) errors.push('app.json 中 pages 为空');

  for (const page of pages) {
    for (const ext of EXTS) {
      const p = path.join(ROOT, `${page}.${ext}`);
      if (!fs.existsSync(p)) {
        // wxss 允许缺失（页面可以不带样式文件），其余必须存在
        if (ext === 'wxss') warnings.push(`页面缺样式文件（可接受）: ${page}.wxss`);
        else errors.push(`页面文件缺失: ${page}.${ext}`);
      }
    }
  }

  /* ---------------- 3. tabBar 图标 ---------------- */

  const tabBar = appConfig.tabBar;
  if (tabBar && Array.isArray(tabBar.list)) {
    if (tabBar.list.length < 2 || tabBar.list.length > 5) {
      errors.push(`tabBar.list 必须是 2-5 项，当前 ${tabBar.list.length} 项`);
    }
    for (const item of tabBar.list) {
      for (const key of ['iconPath', 'selectedIconPath']) {
        if (item[key] && !fs.existsSync(path.join(ROOT, item[key]))) {
          errors.push(`tabBar 图标不存在: ${item[key]}`);
        }
      }
      if (item.pagePath && pages.indexOf(item.pagePath) === -1) {
        errors.push(`tabBar 页面未在 pages 中注册: ${item.pagePath}`);
      }
    }
  }
}

/* ---------------- 4. 自定义组件 ---------------- */

for (const file of jsonFiles) {
  let cfg;
  try {
    cfg = readJSON(file);
  } catch {
    continue; // 语法错误已在第 1 步记录
  }

  const comps = cfg.usingComponents || {};
  for (const [name, compPath] of Object.entries(comps)) {
    // 绝对路径以 / 开头，相对根目录
    const base = compPath.startsWith('/')
      ? path.join(ROOT, compPath.slice(1))
      : path.resolve(path.dirname(file), compPath);

    for (const ext of ['js', 'json', 'wxml']) {
      if (!fs.existsSync(`${base}.${ext}`)) {
        errors.push(`组件文件缺失: ${name} -> ${compPath}.${ext}  (来自 ${rel(file)})`);
      }
    }
  }
}

/* ---------------- 5. require 路径 ---------------- */

const jsFiles = allFiles.filter((f) => f.endsWith('.js') && !f.includes('scripts'));

for (const file of jsFiles) {
  const src = fs.readFileSync(file, 'utf8');
  const re = /require\(\s*['"]([^'"]+)['"]\s*\)/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    const target = m[1];
    if (!target.startsWith('.')) continue; // 跳过内置模块
    const resolved = path.resolve(path.dirname(file), target);
    const exists =
      fs.existsSync(`${resolved}.js`) ||
      fs.existsSync(path.join(resolved, 'index.js')) ||
      fs.existsSync(resolved);
    if (!exists) {
      errors.push(`require 路径不存在: ${rel(file)} -> ${target}`);
    }
  }
}

/* ---------------- 6. wxml 事件绑定 ---------------- */

const EVENT_RE = /(?:bind|catch|capture-bind|capture-catch)[:a-zA-Z]*\s*=\s*"([a-zA-Z_$][\w$]*)"/g;

for (const wxml of allFiles.filter((f) => f.endsWith('.wxml'))) {
  const jsFile = wxml.replace(/\.wxml$/, '.js');
  if (!fs.existsSync(jsFile)) continue;

  const wxmlSrc = fs.readFileSync(wxml, 'utf8');
  const jsSrc = fs.readFileSync(jsFile, 'utf8');

  const handlers = new Set();
  let m;
  while ((m = EVENT_RE.exec(wxmlSrc)) !== null) handlers.add(m[1]);

  for (const h of handlers) {
    // 允许 `name(` 方法简写、`name:` 或 `name =` 赋值形式
    const defined = new RegExp(`\\b${h}\\s*[:(=]`).test(jsSrc);
    if (!defined) {
      errors.push(`事件未定义: ${rel(wxml)} 绑定了 "${h}"，但 ${path.basename(jsFile)} 中找不到`);
    }
  }
}

/* ---------------- 输出 ---------------- */

console.log('========================================');
console.log('  车迹 · 养车记账 · 静态校验');
console.log('========================================\n');

if (appConfig) {
  console.log(`页面数量: ${(appConfig.pages || []).length}`);
  console.log(`JSON 文件: ${jsonFiles.length}`);
  console.log(`JS 文件:   ${jsFiles.length}`);
  console.log(`全部文件: ${allFiles.length}\n`);
}

if (warnings.length) {
  console.log(`提示 (${warnings.length}):`);
  warnings.forEach((w) => console.log(`  ~ ${w}`));
  console.log('');
}

if (errors.length) {
  console.log(`错误 (${errors.length}):`);
  errors.forEach((e) => console.log(`  x ${e}`));
  console.log('\n校验失败');
  process.exit(1);
}

console.log('校验通过，没有发现问题');
process.exit(0);
