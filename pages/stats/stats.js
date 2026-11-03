const app = getApp();
const carService = require('../../services/car');
const fuelLog = require('../../services/fuelLog');
const maintenance = require('../../services/maintenance');
const fuel = require('../../services/fuel');
const format = require('../../utils/format');

const COLORS = {
  cyan: '#00D4FF',
  cyanDim: 'rgba(0, 212, 255, 0.16)',
  amber: '#FF9F0A',
  purple: '#BF5AF2',
  green: '#32D74B',
  grid: 'rgba(255,255,255,0.06)',
  text: '#6B7787',
  textDim: '#47525F'
};

Page({
  data: {
    car: null,
    summary: null,
    // 关键指标
    kpi: {
      avgConsumption: null,
      bestConsumption: null,
      worstConsumption: null,
      totalAmount: 0,
      totalKm: 0,
      costPerKm: null,
      monthAmount: 0,
      maintainCost: 0
    },
    // 图表数据
    consumptionPoints: [],
    monthData: [],
    hasConsumption: false,
    hasMonthData: false,
    loaded: false
  },

  onShow() {
    this.refresh();
  },

  refresh() {
    const carId = app.getActiveCarId();
    const car = carService.getById(carId);
    const { asc, summary } = fuelLog.listWithConsumption(carId);

    /* ---------- KPI ---------- */
    const valid = asc.filter((r) => r.consumption !== null);
    const consumptions = valid.map((r) => r.consumption);

    const maintLogs = maintenance.listByCar(carId);
    const maintainCost = maintLogs.reduce((s, m) => s + (Number(m.cost) || 0), 0);

    // 总花费 = 加油 + 保养，不能只显示加油金额
    const grandTotal = summary.totalAmount + maintainCost;

    const kpi = {
      avgConsumption: summary.avgConsumption,
      bestConsumption: consumptions.length ? Math.min(...consumptions) : null,
      worstConsumption: consumptions.length ? Math.max(...consumptions) : null,
      totalAmount: summary.totalAmount,
      totalKm: summary.totalKm,
      costPerKm: summary.costPerKm,
      monthAmount: fuelLog.monthSpend(carId),
      maintainCost,
      grandTotal
    };

    /* ---------- 油耗趋势点 ---------- */
    const consumptionPoints = valid.map((r) => ({
      value: r.consumption,
      dateText: format.monthDay(r.createdAt),
      mileage: r.mileage
    }));

    /* ---------- 月度花费 ---------- */
    const monthData = fuel.groupByMonth(
      asc.map((r) => ({
        amount: r.amount,
        liters: r.liters,
        createdAt: r.createdAt
      })),
      6
    );

    this.setData(
      {
        car,
        summary,
        kpi: {
          ...kpi,
          avgText: kpi.avgConsumption !== null ? format.fixed(kpi.avgConsumption, 2) : '--',
          bestText: kpi.bestConsumption !== null ? format.fixed(kpi.bestConsumption, 2) : '--',
          worstText: kpi.worstConsumption !== null ? format.fixed(kpi.worstConsumption, 2) : '--',
          totalAmountText: format.money(kpi.totalAmount),
          monthAmountText: format.money(kpi.monthAmount),
          maintainCostText: format.money(kpi.maintainCost),
          grandTotalText: format.money(kpi.grandTotal),
          costPerKmText: kpi.costPerKm !== null ? format.fixed(kpi.costPerKm, 2) : '--',
          totalKmText: format.thousands(kpi.totalKm)
        },
        consumptionPoints,
        monthData,
        hasConsumption: consumptionPoints.length >= 2,
        hasMonthData: monthData.some((m) => m.amount > 0),
        loaded: true
      },
      () => {
        // 数据更新后重绘图表
        this.drawAll();
      }
    );
  },

  drawAll() {
    this.drawConsumptionChart();
    this.drawMonthChart();
  },

  /* ================= 油耗趋势折线图 ================= */

  drawConsumptionChart() {
    const points = this.data.consumptionPoints;
    if (!points || points.length < 2) return;

    const query = wx.createSelectorQuery().in(this);
    query
      .select('#chartConsumption')
      .fields({ node: true, size: true })
      .exec((res) => {
        if (!res || !res[0] || !res[0].node) return;
        const canvas = res[0].node;
        const ctx = canvas.getContext('2d');
        const dpr = (wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync()).pixelRatio || 2;

        canvas.width = res[0].width * dpr;
        canvas.height = res[0].height * dpr;
        ctx.scale(dpr, dpr);

        this.paintLineChart(ctx, res[0].width, res[0].height, points);
      });
  },

  paintLineChart(ctx, w, h, points) {
    ctx.clearRect(0, 0, w, h);

    const PAD_L = 34;
    const PAD_R = 12;
    const PAD_T = 18;
    const PAD_B = 28;

    const plotW = w - PAD_L - PAD_R;
    const plotH = h - PAD_T - PAD_B;

    // Y 轴范围：留 15% 余量，不要从 0 开始（否则曲线被压平看不出波动）
    const values = points.map((p) => p.value);
    const rawMin = Math.min(...values);
    const rawMax = Math.max(...values);
    const span = rawMax - rawMin || 1;
    const yMin = Math.max(0, rawMin - span * 0.25);
    const yMax = rawMax + span * 0.25;

    const xOf = (i) => PAD_L + (points.length === 1 ? plotW / 2 : (i / (points.length - 1)) * plotW);
    const yOf = (v) => PAD_T + plotH - ((v - yMin) / (yMax - yMin)) * plotH;

    /* ---- 网格线 ---- */
    const gridCount = 4;
    ctx.font = '10px -apple-system, sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';

    for (let i = 0; i <= gridCount; i++) {
      const v = yMin + ((yMax - yMin) / gridCount) * i;
      const y = yOf(v);

      ctx.beginPath();
      ctx.moveTo(PAD_L, y);
      ctx.lineTo(w - PAD_R, y);
      ctx.strokeStyle = COLORS.grid;
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = COLORS.textDim;
      ctx.fillText(v.toFixed(1), PAD_L - 6, y);
    }

    /* ---- 面积渐变 ---- */
    const grad = ctx.createLinearGradient(0, PAD_T, 0, PAD_T + plotH);
    grad.addColorStop(0, 'rgba(0, 212, 255, 0.28)');
    grad.addColorStop(1, 'rgba(0, 212, 255, 0)');

    ctx.beginPath();
    ctx.moveTo(xOf(0), yOf(points[0].value));
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(xOf(i), yOf(points[i].value));
    }
    ctx.lineTo(xOf(points.length - 1), PAD_T + plotH);
    ctx.lineTo(xOf(0), PAD_T + plotH);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    /* ---- 折线 ---- */
    ctx.beginPath();
    ctx.moveTo(xOf(0), yOf(points[0].value));
    for (let i = 1; i < points.length; i++) {
      // 用二次贝塞尔做平滑，避免折线显得生硬
      const x0 = xOf(i - 1);
      const y0 = yOf(points[i - 1].value);
      const x1 = xOf(i);
      const y1 = yOf(points[i].value);
      const cx = (x0 + x1) / 2;
      ctx.bezierCurveTo(cx, y0, cx, y1, x1, y1);
    }
    ctx.strokeStyle = COLORS.cyan;
    ctx.lineWidth = 2.5;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.shadowColor = 'rgba(0, 212, 255, 0.6)';
    ctx.shadowBlur = 8;
    ctx.stroke();
    ctx.shadowBlur = 0;

    /* ---- 数据点 ---- */
    points.forEach((p, i) => {
      const x = xOf(i);
      const y = yOf(p.value);

      ctx.beginPath();
      ctx.arc(x, y, 4.5, 0, Math.PI * 2);
      ctx.fillStyle = '#0B0F17';
      ctx.fill();

      ctx.beginPath();
      ctx.arc(x, y, 3.2, 0, Math.PI * 2);
      ctx.fillStyle = COLORS.cyan;
      ctx.fill();
    });

    /* ---- 最后一个点高亮 + 数值 ---- */
    const lastI = points.length - 1;
    const lx = xOf(lastI);
    const ly = yOf(points[lastI].value);

    ctx.beginPath();
    ctx.arc(lx, ly, 8, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 212, 255, 0.2)';
    ctx.fill();

    // 数值标签
    ctx.font = 'bold 11px -apple-system, sans-serif';
    ctx.fillStyle = '#00D4FF';
    ctx.textAlign = lx > w - 50 ? 'right' : 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(points[lastI].value.toFixed(2), lx, ly - 12);

    /* ---- X 轴日期（只显示首尾和中间，避免拥挤）---- */
    ctx.font = '9px -apple-system, sans-serif';
    ctx.fillStyle = COLORS.textDim;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    const labelIdx = points.length <= 4
      ? points.map((_, i) => i)
      : [0, Math.floor((points.length - 1) / 2), points.length - 1];

    labelIdx.forEach((i) => {
      ctx.fillText(points[i].dateText, xOf(i), PAD_T + plotH + 8);
    });
  },

  /* ================= 月度花费柱状图 ================= */

  drawMonthChart() {
    const data = this.data.monthData;
    if (!data || data.length === 0) return;

    const query = wx.createSelectorQuery().in(this);
    query
      .select('#chartMonth')
      .fields({ node: true, size: true })
      .exec((res) => {
        if (!res || !res[0] || !res[0].node) return;
        const canvas = res[0].node;
        const ctx = canvas.getContext('2d');
        const dpr = (wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync()).pixelRatio || 2;

        canvas.width = res[0].width * dpr;
        canvas.height = res[0].height * dpr;
        ctx.scale(dpr, dpr);

        this.paintBarChart(ctx, res[0].width, res[0].height, data);
      });
  },

  paintBarChart(ctx, w, h, data) {
    ctx.clearRect(0, 0, w, h);

    const PAD_L = 34;
    const PAD_R = 12;
    const PAD_T = 22;
    const PAD_B = 26;

    const plotW = w - PAD_L - PAD_R;
    const plotH = h - PAD_T - PAD_B;

    const maxVal = Math.max(...data.map((d) => d.amount), 1);
    // 顶部留 12% 空间放数值标签
    const yMax = maxVal * 1.18;

    const slotW = plotW / data.length;
    const barW = Math.min(28, slotW * 0.52);

    const yOf = (v) => PAD_T + plotH - (v / yMax) * plotH;

    /* ---- 网格 ---- */
    const gridCount = 3;
    ctx.font = '10px -apple-system, sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';

    for (let i = 0; i <= gridCount; i++) {
      const v = (yMax / gridCount) * i;
      const y = yOf(v);

      ctx.beginPath();
      ctx.moveTo(PAD_L, y);
      ctx.lineTo(w - PAD_R, y);
      ctx.strokeStyle = COLORS.grid;
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = COLORS.textDim;
      ctx.fillText(v >= 1000 ? (v / 1000).toFixed(1) + 'k' : Math.round(v), PAD_L - 6, y);
    }

    /* ---- 柱子 ---- */
    const lastIdx = data.length - 1;

    data.forEach((d, i) => {
      const cx = PAD_L + slotW * i + slotW / 2;
      const x = cx - barW / 2;
      const barH = (d.amount / yMax) * plotH;
      const y = PAD_T + plotH - barH;

      if (d.amount <= 0) {
        // 无数据月份画个虚点，表示「这个月没花钱」
        ctx.beginPath();
        ctx.arc(cx, PAD_T + plotH - 3, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = COLORS.textDim;
        ctx.fill();
      } else {
        // 柱子渐变：最新月份用琥珀色突出
        const grad = ctx.createLinearGradient(0, y, 0, PAD_T + plotH);
        if (i === lastIdx) {
          grad.addColorStop(0, '#FFC44D');
          grad.addColorStop(1, 'rgba(255, 159, 10, 0.32)');
        } else {
          grad.addColorStop(0, 'rgba(0, 212, 255, 0.85)');
          grad.addColorStop(1, 'rgba(0, 212, 255, 0.18)');
        }

        // 圆角矩形柱
        const r = Math.min(barW / 2, 6);
        ctx.beginPath();
        ctx.moveTo(x, PAD_T + plotH);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.lineTo(x + barW - r, y);
        ctx.quadraticCurveTo(x + barW, y, x + barW, y + r);
        ctx.lineTo(x + barW, PAD_T + plotH);
        ctx.closePath();
        ctx.fillStyle = grad;
        ctx.fill();

        // 数值标签
        ctx.font = 'bold 10px -apple-system, sans-serif';
        ctx.fillStyle = i === lastIdx ? '#FFC44D' : 'rgba(168,180,194,0.85)';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText(Math.round(d.amount), cx, y - 5);
      }

      // X 轴标签
      ctx.font = '10px -apple-system, sans-serif';
      ctx.fillStyle = i === lastIdx ? '#FFC44D' : COLORS.textDim;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(d.label, cx, PAD_T + plotH + 8);
    });
  }
});
