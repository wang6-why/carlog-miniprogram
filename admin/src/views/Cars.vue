<template>
  <div class="page">
    <div class="toolbar">
      <h2 class="title">车辆管理</h2>
      <el-button type="primary" :icon="Plus" @click="openCreate">新增车辆</el-button>
    </div>

    <el-card>
      <el-table :data="list" v-loading="loading" empty-text="暂无车辆">
        <el-table-column prop="brand" label="品牌" />
        <el-table-column prop="model" label="车型" />
        <el-table-column prop="modelYear" label="年款" width="90" />
        <el-table-column prop="plate" label="车牌" />
        <el-table-column label="燃料" width="90">
          <template #default="{ row }">
            <el-tag size="small" effect="dark">{{ row.fuelType || '—' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="odometer" label="当前里程(km)" width="120" />
        <el-table-column label="操作" width="160">
          <template #default="{ row }">
            <el-button text type="primary" :icon="Edit" @click="openEdit(row)">编辑</el-button>
            <el-button text type="danger" :icon="Delete" @click="onDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="dialog" :title="editing ? '编辑车辆' : '新增车辆'" width="480px">
      <el-form :model="form" :rules="rules" ref="formRef" label-width="86px">
        <el-form-item label="品牌" prop="brand">
          <el-input v-model="form.brand" placeholder="如 大众" />
        </el-form-item>
        <el-form-item label="车型" prop="model">
          <el-input v-model="form.model" placeholder="如 速腾" />
        </el-form-item>
        <el-form-item label="年款" prop="modelYear">
          <el-input-number v-model="form.modelYear" :min="1980" :max="2100" controls-position="right" />
        </el-form-item>
        <el-form-item label="车牌">
          <el-input v-model="form.plate" placeholder="如 鲁A·8K2M9" />
        </el-form-item>
        <el-form-item label="燃料类型">
          <el-select v-model="form.fuelType" placeholder="请选择">
            <el-option label="92#" value="92#" />
            <el-option label="95#" value="95#" />
            <el-option label="98#" value="98#" />
            <el-option label="0#(柴油)" value="0#" />
            <el-option label="纯电" value="EV" />
            <el-option label="混动" value="HEV" />
          </el-select>
        </el-form-item>
        <el-form-item label="油箱容量(L)">
          <el-input-number v-model="form.tankCapacity" :min="0" :max="200" :precision="1" controls-position="right" />
        </el-form-item>
        <el-form-item label="当前里程">
          <el-input-number v-model="form.odometer" :min="0" :max="2000000" controls-position="right" />
        </el-form-item>
        <el-form-item label="购买日期">
          <el-date-picker v-model="form.purchaseDate" type="date" value-format="YYYY-MM-DD" />
        </el-form-item>
        <el-form-item label="保险到期">
          <el-date-picker v-model="form.insuranceExpiry" type="date" value-format="YYYY-MM-DD" />
        </el-form-item>
        <el-form-item label="年检到期">
          <el-date-picker v-model="form.inspectionExpiry" type="date" value-format="YYYY-MM-DD" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialog = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="onSave">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import { Plus, Edit, Delete } from '@element-plus/icons-vue'
import type { Car } from '@/api/types'
import { listCars, createCar, updateCar, deleteCar } from '@/api/car'
import { useCarStore } from '@/stores/cars'

const carStore = useCarStore()
const loading = ref(false)
const list = ref<Car[]>([])
const dialog = ref(false)
const editing = ref<Car | null>(null)
const saving = ref(false)
const formRef = ref<FormInstance>()

const blank = () => ({
  brand: '',
  model: '',
  modelYear: new Date().getFullYear(),
  plate: '',
  fuelType: '92#',
  tankCapacity: 50,
  odometer: 0,
  purchaseDate: '',
  insuranceExpiry: '',
  inspectionExpiry: ''
})
const form = reactive(blank())

const rules: FormRules = {
  brand: [{ required: true, message: '请填写品牌', trigger: 'blur' }],
  model: [{ required: true, message: '请填写车型', trigger: 'blur' }]
}

async function load() {
  loading.value = true
  try {
    list.value = await listCars()
  } finally {
    loading.value = false
  }
}

function openCreate() {
  editing.value = null
  Object.assign(form, blank())
  dialog.value = true
}

function openEdit(row: Car) {
  editing.value = row
  Object.assign(form, {
    brand: row.brand,
    model: row.model,
    modelYear: row.modelYear ?? new Date().getFullYear(),
    plate: row.plate || '',
    fuelType: row.fuelType || '92#',
    tankCapacity: row.tankCapacity ?? 50,
    odometer: row.odometer,
    purchaseDate: row.purchaseDate || '',
    insuranceExpiry: row.insuranceExpiry || '',
    inspectionExpiry: row.inspectionExpiry || ''
  })
  dialog.value = true
}

async function onSave() {
  if (!formRef.value) return
  await formRef.value.validate(async (valid) => {
    if (!valid) return
    saving.value = true
    try {
      if (editing.value) {
        await updateCar(editing.value.id, { ...form })
        ElMessage.success('已更新')
      } else {
        await createCar({ ...form })
        ElMessage.success('已新增')
      }
      dialog.value = false
      await load()
      await carStore.load()
    } finally {
      saving.value = false
    }
  })
}

function onDelete(row: Car) {
  ElMessageBox.confirm(`确定删除「${row.brand} ${row.model}」吗？`, '提示', { type: 'warning' })
    .then(async () => {
      await deleteCar(row.id)
      ElMessage.success('已删除')
      await load()
      await carStore.load()
    })
    .catch(() => {})
}

onMounted(load)
</script>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.title {
  margin: 0;
  font-size: 18px;
}
</style>
