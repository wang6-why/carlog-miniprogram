/**
 * 油耗仪表盘组件
 *
 * 视觉上模拟汽车油表：半圆弧 + 刻度 + 指针。
 * 用 Canvas 2D 绘制，因为纯 CSS 做不出弧形刻度和渐变发光。
 *
 * 为什么不用第三方图表库：
 *   图表库给小程序引入会显著增加包体积（ECharts 定制包 200KB+），
 *   而我们只需要一个半圆仪表，手写 100 行就够，还更好控制视觉。
 */

const format = require('../../utils/format');

Component({
  properties: {
    /** 当前值（油耗 L/100km） */
    value: { type: Number, value: 0 },
    /** 量程上限 */
    max: { type: Number, value: 15 },
    /** 量程下限 */
    min: { type: Number, value: 0 },
    /** 主标题 */
    title: { type: String, value: '综合油耗' },
    /** 副标题（如「近 6 次记录」） */
    subtitle: { type: String, value: '' },
    /** 是否显示为「暂无数据」 */
    empty: { type: Boolean, value: false }
  },

  data: {
    canvasId: 'gauge_' + Math.floor(Math.random() * 100000),
    displayValue: '--',
    percent: 0
  },

  observers: {
    'value, max, min, empty'(value) {
      this.updateDisplay();
      this.draw();
    }
  },

  lifetimes: {
    attached() {
      this.updateDisplay();
    },
    ready() {
      this.initCanvas();
    }
  },

  methods: {
    updateDisplay() {
      const { value, max, min, empty } = this.properties;
      if (empty || !value) {
        this.setData({ displayValue: '--', percent: 0 });
        return;
      }
      const ratio = Math.min(1, Math.max(0, (value - min) / (max - min)));
      this.setData({
        displayValue: format.fixed(value, 1),
        percent: Math.round(ratio * 100)
      });
    },

    initCanvas() {
      const query = this.createSelectorQuery();
      query
        .select('#' + this.data.canvasId)
        .fields({ node: true, size: true })
        .exec((res) => {
          if (!res || !res[0] || !res[0].node) {
            // 部分基础库不支持 canvas 2d，降级为不绘制（但数字仍显示）
            return;
          }
          const canvas = res[0].node;
          const ctx = canvas.getContext('2d');
          const dpr = (wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync()).pixelRatio || 2;

          canvas.width = res[0].width * dpr;
          canvas.height = res[0].height * dpr;
          ctx.scale(dpr, dpr);

          this.canvas = canvas;
          this.ctx = ctx;
          this.cw = res[0].width;
          this.ch = res[0].height;

          this.draw();
        });
    },

    draw() {
      const ctx = this.ctx;
      if (!ctx) return;

      const w = this.cw;
      const h = this.ch;
      const { value, max, min, empty } = this.properties;

      ctx.clearRect(0, 0, w, h);

      // 圆心在底部中间，半径让半圆刚好铺满
      const cx = w / 2;
      const cy = h * 0.88;
      const radius = Math.min(w / 2 - 16, h * 0.78);
      const lineWidth = 14;

      const START = Math.PI; // 180°，左端
      const END = Math.PI * 2; // 360°，右端

      /* ---------- 1. 背景轨道 ---------- */
      ctx.beginPath();
      ctx.arc(cx, cy, radius, START, END);
      ctx.strokeStyle = 'rgba(255,255,255,0.07)';
      ctx.lineWidth = lineWidth;
      ctx.lineCap = 'round';
      ctx.stroke();

      /* ---------- 2. 刻度线 ---------- */
      const tickCount = 30;
      for (let i = 0; i <= tickCount; i++) {
        const t = i / tickCount;
        const angle = START + t * Math.PI;
        const isMajor = i % 5 === 0;

        const outer = radius + lineWidth / 2 + 6;
        const inner = outer - (isMajor ? 10 : 5);

        const x1 = cx + Math.cos(angle) * inner;
        const y1 = cy + Math.sin(angle) * inner;
        const x2 = cx + Math.cos(angle) * outer;
        const y2 = cy + Math.sin(angle) * outer;

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.strokeStyle = isMajor ? 'rgba(168,180,194,0.5)' : 'rgba(107,119,135,0.32)';
        ctx.lineWidth = isMajor ? 2 : 1;
        ctx.stroke();
      }

      /* ---------- 3. 数值弧（带发光） ---------- */
      if (!empty && value > 0) {
        const ratio = Math.min(1, Math.max(0, (value - min) / (max - min)));
        const endAngle = START + ratio * Math.PI;

        // 发光层：粗一点、半透明，模拟霓虹
        ctx.beginPath();
        ctx.arc(cx, cy, radius, START, endAngle);
        ctx.strokeStyle = 'rgba(0, 212, 255, 0.22)';
        ctx.lineWidth = lineWidth + 12;
        ctx.lineCap = 'round';
        ctx.stroke();

        // 主体渐变弧
        const grad = ctx.createLinearGradient(cx - radius, 0, cx + radius, 0);
        grad.addColorStop(0, '#00B4D8');
        grad.addColorStop(0.5, '#00D4FF');
        grad.addColorStop(1, '#5CE1FF');

        ctx.beginPath();
        ctx.arc(cx, cy, radius, START, endAngle);
        ctx.strokeStyle = grad;
        ctx.lineWidth = lineWidth;
        ctx.lineCap = 'round';
        ctx.stroke();

        // 端点亮球
        const px = cx + Math.cos(endAngle) * radius;
        const py = cy + Math.sin(endAngle) * radius;

        ctx.beginPath();
        ctx.arc(px, py, lineWidth / 2 + 5, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 212, 255, 0.25)';
        ctx.fill();

        ctx.beginPath();
        ctx.arc(px, py, lineWidth / 2 - 1, 0, Math.PI * 2);
        ctx.fillStyle = '#B8F0FF';
        ctx.fill();
      }

      /* ---------- 4. 量程两端的数字 ---------- */
      ctx.font = '11px -apple-system, sans-serif';
      ctx.fillStyle = 'rgba(107,119,135,0.9)';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      const labelR = radius - lineWidth - 8;
      ctx.fillText(String(min), cx - labelR, cy + 14);
      ctx.fillText(String(max), cx + labelR, cy + 14);
    },

    onTap() {
      this.triggerEvent('tap', { value: this.properties.value });
    }
  }
});
