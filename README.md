# 车迹 · 养车记账小程序

<p align="left">
  <img alt="validate" src="https://github.com/wang6-why/carlog-miniprogram/actions/workflows/validate.yml/badge.svg">
  <img alt="license" src="https://img.shields.io/badge/license-MIT-32D74B">
  <img alt="pages" src="https://img.shields.io/badge/pages-8-00D4FF">
  <img alt="tests" src="https://img.shields.io/badge/tests-84%20passed-32D74B">
  <img alt="platform" src="https://img.shields.io/badge/WeChat-原生小程序-07C160">
</p>

一个给「自己养车的人」用的记账工具。加一次油记一笔，剩下的交给它：算真实油耗、算每公里成本、按「里程或时间先到」提醒保养。

> 常见养车 App 的通病是功能堆到你看不懂。这个项目的取舍是——**只做三件事：记账、算油耗、提醒保养**，把这三件事做到算得准、看得懂。

在线预览（纯 HTML 交互原型，无需安装）：`docs/index.html`

---

## 为什么是「记账」而不是「看车」

「汽车相关小程序」有两条路：

| 方向 | 典型功能 | 个人开发者可行性 |
|---|---|---|
| 看车 / 选车 | 车型库、参数对比、口碑 | ❌ 数据源被平台垄断，内容同质化严重 |
| **用车 / 养车** | 加油记账、油耗分析、保养提醒 | ✅ 数据是用户自己的，不依赖外部授权，有真实使用粘性 |

养车记账的核心价值不在「记录」本身（Excel 也能记），而在**算**：加满法算油耗、里程与时间双维度推算保养到期。这部分是纯业务逻辑，可以完整测试、可以讲清楚——对一个作品集项目来说，这比多刷几个页面有用。

---

## 功能

### 仪表盘（首页）
- 深色 HUD 风格油耗仪表：Canvas 2D 手绘半圆弧 + 30 格刻度 + 渐变发光数值弧
- 三枚核心读数：最近油耗、本月油费、累计里程
- 里程条：总里程 / 记录里程 / 每公里成本
- 保养提醒卡：超期与即将到期项置顶，带进度条和剩余量文案
- 多车切换（车辆色点、车牌）

### 记一笔
- 加油记账：里程、升数、单价、金额（自动互算）、是否加满、油站、备注
- 保养记账：8 个项目模板（机油、空滤、空调滤、火花塞、刹车片、轮胎换位、防冻液、电瓶）
- 支持从首页 / 保养页 / 记录页带参跳入，自动预选类型与项目
- 校验 + 非阻断的里程合理性提示（补录历史记录是合法场景，不能硬拦）

### 记录
- 加油 / 保养双 Tab，按月分组，展示每段油耗与每公里花费
- 点击编辑、长按删除
- WXML 不支持管道过滤器，所有展示文本（`totalLitersText`、`totalAmountText`）在 JS 里预格式化

### 分析
- Canvas 手绘：6 个月油费柱状图 + 油耗趋势折线
- 总花费 = 油费 + 保养费（`grandTotal`）
- 油耗最高 / 最低记录、平均单价

### 保养看板
- 8 个项目一次性摊开：上次时间、上次里程、下次到期里程 / 日期、剩余量、进度条
- 状态三档：已超期 / 即将到期 / 正常
- 「里程或时间先到者提醒」——只算里程会让开得少的用户永远等不到机油提醒，而机油会随时间氧化

### 车库 / 我的 / 设置
- 车辆增删改，保额到期与年检到期字段
- 数据导出为 JSON 文本、清空重建、切换默认车辆

---

## 技术实现

原生微信小程序（WXML / WXSS / JS / JSON），零第三方依赖，无 npm 构建。

```
carlog/
├── app.js / app.json / app.wxss      全局生命周期、路由、设计系统
├── assets/tabbar/                    深色 tabBar 图标（脚本生成 PNG）
├── components/
│   └── gauge/                        油耗仪表盘（Canvas 2D）
├── pages/                            8 个页面
│   ├── dashboard/                    仪表盘
│   ├── add/                          记一笔
│   ├── records/                      记录
│   ├── stats/                        分析
│   ├── maintain/                     保养看板
│   ├── garage/                       车库
│   ├── mine/                         我的
│   └── settings/                     设置
├── services/
│   ├── fuel.js                       油耗引擎（核心）
│   ├── maintenance.js                保养推算（核心）
│   ├── fuelLog.js                    加油记录 CRUD + 校验
│   └── car.js                        车辆 CRUD + 里程同步
├── utils/                            storage / format / ui
├── mock/data.js                      两辆车 + 15 条加油 + 8 条保养
├── tests/                            84 项测试
└── scripts/validate.js               静态校验
```

### 设计系统

`app.wxss` 里用 CSS 变量定义了一套深色 HUD 色板：

- 底色 `#0B0F17 → #1E2733` 四级阶梯，越靠上越亮，形成物理纵深
- 主色青 `#00D4FF`（数据 / 正常），语义色分工明确：红 `#FF3B5C`（超期）、橙 `#FF9F0A`（油价 / 待办）、绿 `#32D74B`（良好）、紫 `#BF5AF2`（保养）
- 关键数字统一 `.reading` 类：等宽字体 + `tabular-nums` + 负字距，模拟仪表读数的机械感

---

## 两个核心算法

### 1. 加满法算油耗（`services/fuel.js`）

油耗 = 加油量 / 行驶距离 × 100，但**只有两次「加满」之间的油量才能算**。非加满时你不知道油箱里剩多少，也确定不了这次油对应哪段路。

```
加满 10000km → 加 30L 10400km（非满）→ 加 40L 10900km（加满）
这一段油耗 = (30 + 40) / (10900 − 10000) × 100 = 7.78 L/100km
```

关键细节：**总油耗不能用「各段油耗求平均」**，因为每段里程权重不同。正确做法是「有效区间总油量 / 有效区间总里程」。

```js
const avgConsumption =
  totalSegmentKm > 0 ? (totalSegmentLiters / totalSegmentKm) * 100 : null;
```

### 2. 保养双维度推算（`services/maintenance.js`）

```
下次到期里程 = 上次里程 + 里程周期
下次到期时间 = 上次日期 + 月数周期
剩余里程 / 剩余天数任一 ≤ 0  →  已超期
剩余里程 ≤ 500km 或 剩余天数 ≤ 30天  →  即将到期
```

**踩过的坑：**

`new Date('2026-01-31')` 会被当成 UTC 午夜，在东八区变成 08:00，跨月算天数会差一天。所以全项目日期统一走 `format.parseDate()`，纯日期字符串走 `new Date(y, m-1, d)` 构造本地时间。

月末加月份会溢出：`2026-01-31` 加 12 个月，直接 `setMonth(+12)` 会得到 `2027-03-03`。正确实现是先算目标月最后一天，再 `Math.min` 回退：

```js
function addMonths(ts, months) {
  const d = new Date(ts);
  const day = d.getDate();
  const year = d.getFullYear();
  const month = d.getMonth() + months;
  const lastDayOfTargetMonth = new Date(year, month + 1, 0).getDate();
  d.setDate(1);
  d.setFullYear(year);
  d.setMonth(month);
  d.setDate(Math.min(day, lastDayOfTargetMonth));
  return d.getTime();
}
```

---

## 质量保障

```bash
npm run check     # 静态校验 + 全部测试
```

**静态校验** `scripts/validate.js` 覆盖 6 类在开发者工具里一次只报一个、来回折腾的错：

1. JSON 语法（含 Windows 下常见的 BOM 头）
2. app.json 注册的页面是否四件套齐全
3. tabBar 图标文件是否存在、页面是否已注册
4. usingComponents 指向的组件文件是否存在
5. require 相对路径是否真实存在
6. WXML 里 `bindtap="foo"` 的方法是否在对应 JS 中定义

**测试** 84 项，纯 Node 运行（用内存 storage 桩替换 `wx.*`）：

| 文件 | 项数 | 覆盖 |
|---|---|---|
| `tests/__fuel_test.js` | 28 | 加满法、非满混合、首笔基准、乱序输入、异常数据、月聚合 |
| `tests/__maint_test.js` | 25 | 双维度状态、月末溢出、闰年、从未保养、不存在车辆 |
| `tests/__e2e_test.js` | 31 | 跨车辆切换、编辑删除、里程同步、数据持久化 |

CI 在 GitHub Actions 上跑同一套（`.github/workflows/validate.yml`）。

---

## 运行

1. 微信开发者工具 → 导入项目 → 选择本目录
2. AppID 选「测试号」（`project.config.json` 里是 `touristappid`）
3. 编译即可看到仪表盘，首启会自动灌入 2 辆车 + 23 条 mock 记录

数据存 `wx.setStorageSync`，`清除缓存` 会重新灌 mock。

---

## 已知限制

- 数据仅存本地，换设备不迁移（导出 JSON 是临时方案）
- 仪表盘 / 图表需要基础库 ≥ 2.9（Canvas 2D），低版本会降级为只显示数字
- 无云端同步、无订阅消息推送（保养提醒是打开小程序时算出来的，不是推送）
- 保养周期取自通用模板，不同车型手册差异未做适配

## License

MIT
