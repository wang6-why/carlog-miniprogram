const app = getApp();
const carService = require('../../services/car');
const fuelLog = require('../../services/fuelLog');
const format = require('../../utils/format');
const ui = require('../../utils/ui');

const COLORS = ['#00D4FF', '#32D74B', '#FF9F0A', '#BF5AF2', '#FF3B5C'];
const FUEL_TYPES = ['92#', '95#', '98#', '0#柴油', '新能源'];

Page({
  data: {
    cars: [],
    activeId: '',
    // 编辑弹层
    editing: false,
    editMode: 'create', // create | edit
    form: {
      id: '',
      brand: '',
      model: '',
      year: '',
      plate: '',
      fuelType: '92#',
      tankCapacity: '',
      odometer: '',
      color: COLORS[0]
    },
    colorOptions: COLORS,
    fuelTypes: FUEL_TYPES,
    loaded: false
  },

  onShow() {
    this.refresh();
  },

  refresh() {
    const cars = carService.getAll().map((c) => {
      const { summary } = fuelLog.listWithConsumption(c.id);
      return {
        ...c,
        // 展示字段
        consumptionText:
          summary.latestConsumption !== null ? format.fixed(summary.latestConsumption, 1) : '--',
        recordCount: summary.recordCount,
        totalKm: summary.totalKm,
        isActive: c.id === app.getActiveCarId()
      };
    });

    this.setData({
      cars,
      activeId: app.getActiveCarId(),
      loaded: true
    });
  },

  /* ================= 切换当前车辆 ================= */

  onSwitch(e) {
    const id = e.currentTarget.dataset.id;
    if (id === app.getActiveCarId()) return;
    app.switchCar(id);
    ui.tapFeedback();
    this.refresh();
    ui.toast('已切换车辆');
  },

  /* ================= 新增 / 编辑 ================= */

  onAdd() {
    this.setData({
      editing: true,
      editMode: 'create',
      form: {
        id: '',
        brand: '',
        model: '',
        year: String(new Date().getFullYear()),
        plate: '',
        fuelType: '92#',
        tankCapacity: '50',
        odometer: '0',
        color: COLORS[this.data.cars.length % COLORS.length]
      }
    });
  },

  onEdit(e) {
    const id = e.currentTarget.dataset.id;
    const car = carService.getById(id);
    if (!car) return;
    this.setData({
      editing: true,
      editMode: 'edit',
      form: {
        id: car.id,
        brand: car.brand || '',
        model: car.model || '',
        year: String(car.year || ''),
        plate: car.plate || '',
        fuelType: car.fuelType || '92#',
        tankCapacity: String(car.tankCapacity || ''),
        odometer: String(car.odometer || ''),
        color: car.color || COLORS[0]
      }
    });
  },

  onCloseEdit() {
    this.setData({ editing: false });
  },

  noop() {},

  onFormInput(e) {
    const field = e.currentTarget.dataset.field;
    this.setData({ [`form.${field}`]: e.detail.value });
  },

  onColorTap(e) {
    this.setData({ 'form.color': e.currentTarget.dataset.color });
    ui.tapFeedback();
  },

  onFuelTypeChange(e) {
    const idx = Number(e.detail.value);
    this.setData({ 'form.fuelType': FUEL_TYPES[idx] });
  },

  onSave() {
    const f = this.data.form;

    if (!f.brand.trim()) {
      ui.toast('请填写品牌');
      return;
    }
    if (!f.model.trim()) {
      ui.toast('请填写车型');
      return;
    }

    const payload = {
      brand: f.brand.trim(),
      model: f.model.trim(),
      year: Number(f.year) || new Date().getFullYear(),
      plate: f.plate.trim(),
      fuelType: f.fuelType,
      tankCapacity: Number(f.tankCapacity) || 50,
      odometer: Number(f.odometer) || 0,
      color: f.color
    };

    if (this.data.editMode === 'create') {
      const car = carService.create(payload);
      app.switchCar(car.id);
      ui.success('已添加');
    } else {
      carService.update(f.id, payload);
      ui.success('已保存');
    }

    this.setData({ editing: false });
    this.refresh();
  },

  async onDelete() {
    const id = this.data.form.id;
    const cars = carService.getAll();

    if (cars.length <= 1) {
      ui.toast('至少保留一辆车');
      return;
    }

    const ok = await ui.confirmDanger(
      '删除车辆会同时删除该车的加油与保养记录，且无法恢复。确定删除？'
    );
    if (!ok) return;

    carService.remove(id);

    // 如果删的是当前车辆，切到第一辆
    if (app.getActiveCarId() === id) {
      const rest = carService.getAll();
      if (rest.length > 0) app.switchCar(rest[0].id);
    }

    ui.success('已删除');
    this.setData({ editing: false });
    this.refresh();
  }
});
