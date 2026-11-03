const app = getApp();
const carService = require('../../services/car');
const fuelLog = require('../../services/fuelLog');
const maintenance = require('../../services/maintenance');
const fuel = require('../../services/fuel');
const format = require('../../utils/format');
const ui = require('../../utils/ui');

Page({
  data: {
    type: 'fuel', // fuel | maintain
    isEdit: false,
    editId: '',

    // 车辆
    car: null,

    // ============ 加油表单 ============
    mileage: '',
    liters: '',
    price: '',
    amount: '',
    isFull: true,
    dateText: '',
    station: '',
    note: '',

    // 金额是否手动改过（改过就不再自动算）
    amountTouched: false,

    // 上次里程提示
    lastMileage: null,

    // 实时预览：这笔记录会算出多少油耗
    previewConsumption: null,
    previewText: '',

    // ============ 保养表单 ============
    maintTemplates: [],
    maintKey: '',
    maintName: '',
    maintMileage: '',
    maintCost: '',
    maintShop: '',
    maintDateText: '',
    maintNote: '',

    // 状态
    submitting: false
  },

  onLoad(options) {
    const type = options.type === 'maintain' ? 'maintain' : 'fuel';
    const carId = app.getActiveCarId();
    const car = carService.getById(carId);

    const templates = maintenance.templates();
    const today = format.date(Date.now());

    // 从保养看板点进来会带 preset=key，直接选中该项目
    const presetTpl = options.preset ? maintenance.getTemplate(options.preset) : null;
    const initialTpl = presetTpl || templates[0];

    this.setData({
      type,
      car,
      dateText: today,
      maintDateText: today,
      maintTemplates: templates,
      maintKey: initialTpl ? initialTpl.key : '',
      maintName: initialTpl ? initialTpl.name : '',
      lastMileage: fuelLog.lastMileage(carId),
      // 预填当前里程，减少输入
      mileage: car ? String(car.odometer || '') : '',
      maintMileage: car ? String(car.odometer || '') : ''
    });

    // 编辑模式
    if (options.id) {
      if (type === 'fuel') this.loadFuelRecord(options.id);
      else this.loadMaintRecord(options.id);
    }

    wx.setNavigationBarTitle({
      title: options.id ? '编辑记录' : type === 'fuel' ? '记加油' : '记保养'
    });
  },

  loadFuelRecord(id) {
    const rec = fuelLog.getById(id);
    if (!rec) {
      ui.toast('记录不存在');
      return;
    }
    this.setData({
      isEdit: true,
      editId: id,
      mileage: String(rec.mileage),
      liters: String(rec.liters),
      price: String(rec.price),
      amount: String(rec.amount),
      isFull: rec.isFull,
      dateText: format.date(rec.createdAt),
      station: rec.station || '',
      note: rec.note || '',
      amountTouched: true // 编辑时不自动覆盖已有金额
    });
  },

  loadMaintRecord(id) {
    const list = maintenance.listByCar(app.getActiveCarId());
    const rec = list.find((r) => r.id === id);
    if (!rec) {
      ui.toast('记录不存在');
      return;
    }
    this.setData({
      isEdit: true,
      editId: id,
      maintKey: rec.key,
      maintName: rec.name,
      maintMileage: String(rec.mileage),
      maintCost: String(rec.cost || ''),
      maintShop: rec.shop || '',
      maintDateText: rec.date,
      maintNote: rec.note || ''
    });
  },

  /* ================= 加油表单输入 ================= */

  onMileageInput(e) {
    this.setData({ mileage: e.detail.value }, () => this.updatePreview());
  },

  onLitersInput(e) {
    this.setData({ liters: e.detail.value }, () => this.autoCalcAmount());
  },

  onPriceInput(e) {
    this.setData({ price: e.detail.value }, () => this.autoCalcAmount());
  },

  onAmountInput(e) {
    // 用户手动改金额后，就不再自动覆盖（真实加油站有抹零）
    this.setData({ amount: e.detail.value, amountTouched: true });
  },

  onStationInput(e) {
    this.setData({ station: e.detail.value });
  },

  onNoteInput(e) {
    this.setData({ note: e.detail.value });
  },

  onDateChange(e) {
    this.setData({ dateText: e.detail.value });
  },

  onFullChange(e) {
    this.setData({ isFull: e.detail.value }, () => this.updatePreview());
  },

  /** 升数 × 单价 = 金额，仅在用户没手动改金额时自动填 */
  autoCalcAmount() {
    if (this.data.amountTouched) return;
    const liters = parseFloat(this.data.liters);
    const price = parseFloat(this.data.price);
    if (liters > 0 && price > 0) {
      this.setData({ amount: (liters * price).toFixed(2) });
    } else {
      this.setData({ amount: '' });
    }
    this.updatePreview();
  },

  /**
   * 实时预览：这笔记录加进去后，会算出多少油耗
   *
   * 这是这个页面最有价值的交互 —— 用户填完就知道「这次油耗多少」，
   * 而不是存完再去统计页看。计算方式是临时插入这笔记录，跑一遍引擎。
   */
  updatePreview() {
    const { mileage, liters, price, isFull, dateText } = this.data;
    const carId = app.getActiveCarId();

    const m = parseFloat(mileage);
    const l = parseFloat(liters);
    const p = parseFloat(price);

    if (!m || !l || m <= 0 || l <= 0) {
      this.setData({ previewConsumption: null, previewText: '' });
      return;
    }

    // 拿现有记录，把当前这笔临时塞进去算
    const rows = fuelLog.listByCar(carId).filter((r) => r.id !== this.data.editId);

    const tempRow = {
      id: '__preview__',
      mileage: m,
      liters: l,
      price: p,
      amount: l * p,
      isFull,
      createdAt: format.parseDate(dateText)
    };

    const all = rows.concat([tempRow]);
    const computed = fuel.calcConsumption(all);
    const mine = computed.find((r) => r.id === '__preview__');

    if (mine && mine.consumption !== null) {
      this.setData({
        previewConsumption: mine.consumption,
        previewText: `本次油耗 ${format.fixed(mine.consumption, 2)} L/100km（${mine.segmentKm}km 用了 ${format.fixed(mine.segmentLiters, 1)}L）`
      });
    } else if (!isFull) {
      this.setData({
        previewConsumption: null,
        previewText: '未勾选加满，本次不单独计算油耗，会和下次加满一起结算'
      });
    } else {
      this.setData({
        previewConsumption: null,
        previewText: '这是第一条加满记录，作为油耗计算起点，下次加满后出结果'
      });
    }
  },

  /* ================= 保养表单输入 ================= */

  onMaintTemplateTap(e) {
    const key = e.currentTarget.dataset.key;
    const tpl = maintenance.getTemplate(key);
    if (!tpl) return;
    this.setData({ maintKey: key, maintName: tpl.name });
    ui.tapFeedback();
  },

  onMaintMileageInput(e) {
    this.setData({ maintMileage: e.detail.value });
  },

  onMaintCostInput(e) {
    this.setData({ maintCost: e.detail.value });
  },

  onMaintShopInput(e) {
    this.setData({ maintShop: e.detail.value });
  },

  onMaintDateChange(e) {
    this.setData({ maintDateText: e.detail.value });
  },

  onMaintNoteInput(e) {
    this.setData({ maintNote: e.detail.value });
  },

  /* ================= 提交 ================= */

  onSubmit() {
    if (this.data.submitting) return;

    if (this.data.type === 'fuel') this.submitFuel();
    else this.submitMaintain();
  },

  submitFuel() {
    const carId = app.getActiveCarId();
    const d = this.data;

    const payload = {
      id: this.data.editId,
      carId,
      mileage: d.mileage,
      liters: d.liters,
      price: d.price,
      amount: d.amount,
      isFull: d.isFull,
      createdAt: format.fromPickerDate(d.dateText),
      station: d.station,
      note: d.note
    };

    const errors = fuelLog.validate(payload, carId);
    if (errors.length > 0) {
      ui.toast(errors[0]);
      return;
    }

    // 非阻断的里程合理性提示
    const warning = fuelLog.mileageWarning(payload, carId);
    if (warning) {
      ui.confirm(warning, '里程提醒').then((go) => {
        if (go) this.doSaveFuel(payload);
      });
      return;
    }

    this.doSaveFuel(payload);
  },

  doSaveFuel(payload) {
    this.setData({ submitting: true });

    if (this.data.isEdit) {
      fuelLog.update(this.data.editId, payload);
      ui.success('已保存');
    } else {
      fuelLog.create(payload);
      ui.success('已记录');
    }

    setTimeout(() => {
      this.setData({ submitting: false });
      wx.navigateBack({
        fail: () => wx.switchTab({ url: '/pages/dashboard/dashboard' })
      });
    }, 700);
  },

  submitMaintain() {
    const carId = app.getActiveCarId();
    const d = this.data;

    if (!d.maintKey) {
      ui.toast('请选择保养项目');
      return;
    }
    const mileage = parseFloat(d.maintMileage);
    if (!mileage || mileage <= 0) {
      ui.toast('请填写保养时里程');
      return;
    }

    const tpl = maintenance.getTemplate(d.maintKey);
    const payload = {
      carId,
      key: d.maintKey,
      name: tpl ? tpl.name : d.maintName,
      icon: tpl ? tpl.icon : '🔧',
      date: d.maintDateText,
      mileage,
      cost: parseFloat(d.maintCost) || 0,
      shop: d.maintShop,
      note: d.maintNote
    };

    this.setData({ submitting: true });

    if (this.data.isEdit) {
      maintenance.update(this.data.editId, payload);
      ui.success('已保存');
    } else {
      maintenance.create(payload);
      ui.success('已记录');
    }

    setTimeout(() => {
      this.setData({ submitting: false });
      wx.navigateBack({
        fail: () => wx.switchTab({ url: '/pages/dashboard/dashboard' })
      });
    }, 700);
  },

  /* ================= 删除 ================= */

  async onDelete() {
    const ok = await ui.confirmDanger(
      this.data.type === 'fuel' ? '删除后油耗会重新计算，确定删除？' : '确定删除这条保养记录？'
    );
    if (!ok) return;

    if (this.data.type === 'fuel') fuelLog.remove(this.data.editId);
    else maintenance.remove(this.data.editId);

    ui.success('已删除');
    setTimeout(() => wx.navigateBack(), 600);
  },

  /** 用上次里程快速填入 */
  onUseLastMileage() {
    if (this.data.lastMileage) {
      this.setData({ mileage: String(this.data.lastMileage) }, () => this.updatePreview());
    }
  }
});
