<template>
  <div class="page">
    <div class="toolbar">
      <h2 class="title">加油记录</h2>
      <div class="actions">
        <span class="muted">车辆：{{ carName }}</span>
        <el-button type="primary" :icon="Plus" :disabled="!carStore.currentCarId" @click="openCreate">
          新增加油
        </el-button>
      </div>
    </div>

    <el-card>
      <el-table :data="list" v-loading="loading" empty-text="暂无加油记录">
        <el-table-column prop="fuelDate" label="日期" width="120" />
        <el-table-column prop="mileage" label="里程(km)" width="110" />
        <el-table-column label="是否加满" width="100">
          <template #default="{ row }">
            <el-tag size="small" :type="row.isFull ? 'success' : 'info'">
              {{ row.isFull ? '加满' : '非满' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="liters" label="升数(L)" width="100" />
        <el-table-column prop="price" label="单价(元)" width="100" />
        <el-table-column prop="amount" label="金额(元)" width="110" />
        <el-table-column prop="station" label="加油站" />
        <el-table-column label="操作" width="160">
          <template #default="{ row }">
            <el-button text type="primary" :icon="Edit" @click="openEdit(row)">编辑</el-button>
            <el-button text type="danger" :icon="Delete" @click="onDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="dialog" :title="editing ? '编辑加油记录' : '新增加油记录'" width="460px">
      <el-form :model="form" :rules="rules" ref="formRef" label-width="86px">
        <el-form-item label="加油日期" prop="fuelDate">
          <el-date-picker v-model="form.fuelDate" type="date" value-format="YYYY-MM-DD" />
        </el-form-item>
        <el-form-item label="当时里程" prop="mileage">
          <el-input-number v-model="form.mileage" :min="0" :max="2000000" controls-position="right" />
        </el-form-item>
        <el-form-item label="升数(L)" prop="liters">
          <el-input-number v-model="form.liters" :min="0" :max="200" :precision="2" controls-position="right" />
        </el-form-item>
        <el-form-item label="单价(元)" prop="price">
          <el-input-number v-model="form.price" :min="0" :max="20" :precision="2" controls-position="right" />
        </el-form-item>
        <el-form-item label="金额(元)">
          <el-input-number v-model="form.amount" :min="0" :max="5000" :precision="2" controls-position="right" />
          <span class="muted hint">默认按 升数×单价 自动算</span>
        </el-form-item>
        <el-form-item label="是否加满">
          <el-switch v-model="form.isFull" />
        </el-form-item>
        <el-form-item label="加油站">
          <el-input v-model="form.station" placeholder="如 中石化 XX 站" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="form.note" type="textarea" :rows="2" />
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
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import { Plus, Edit, Delete } from '@element-plus/icons-vue'
import type { FuelLog } from '@/api/types'
import { listFuelLogs, createFuelLog, updateFuelLog, deleteFuelLog } from '@/api/fuel'
import { useCarStore } from '@/stores/cars'

const carStore = useCarStore()
const loading = ref(false)
const list = ref<FuelLog[]>([])
const dialog = ref(false)
const editing = ref<FuelLog | null>(null)
const saving = ref(false)
const formRef = ref<FormInstance>()

const carName = computed(() => {
  const c = carStore.cars.find((x) => x.id === carStore.currentCarId)
  return c ? `${c.brand} ${c.model}` : '未选择'
})

const blank = () => ({
  carId: carStore.currentCarId,
  fuelDate: new Date().toISOString().slice(0, 10),
  mileage: 0,
  liters: 0,
  price: 7.4,
  amount: 0,
  isFull: true,
  station: '',
  note: ''
})
const form = reactive(blank())

const rules: FormRules = {
  fuelDate: [{ required: true, message: '请选择日期', trigger: 'change' }],
  mileage: [{ required: true, message: '请填写里程', trigger: 'blur' }],
  liters: [{ required: true, message: '请填写升数', trigger: 'blur' }],
  price: [{ required: true, message: '请填写单价', trigger: 'blur' }]
}

async function load() {
  loading.value = true
  try {
    list.value = await listFuelLogs(carStore.currentCarId || undefined)
  } finally {
    loading.value = false
  }
}

function syncAmount() {
  form.amount = Math.round((form.liters || 0) * (form.price || 0) * 100) / 100
}

function openCreate() {
  editing.value = null
  Object.assign(form, blank())
  form.amount = Math.round(form.liters * form.price * 100) / 100
  dialog.value = true
}

function openEdit(row: FuelLog) {
  editing.value = row
  Object.assign(form, {
    carId: row.carId,
    fuelDate: row.fuelDate,
    mileage: row.mileage,
    liters: row.liters,
    price: row.price,
    amount: row.amount,
    isFull: row.isFull,
    station: row.station || '',
    note: row.note || ''
  })
  dialog.value = true
}

async function onSave() {
  if (!formRef.value) return
  await formRef.value.validate(async (valid) => {
    if (!valid) return
    syncAmount()
    saving.value = true
    try {
      if (editing.value) {
        await updateFuelLog(editing.value.id, { ...form })
        ElMessage.success('已更新')
      } else {
        await createFuelLog({ ...form })
        ElMessage.success('已新增')
      }
      dialog.value = false
      await load()
    } finally {
      saving.value = false
    }
  })
}

function onDelete(row: FuelLog) {
  ElMessageBox.confirm('确定删除这条加油记录吗？', '提示', { type: 'warning' })
    .then(async () => {
      await deleteFuelLog(row.id)
      ElMessage.success('已删除')
      await load()
    })
    .catch(() => {})
}

onMounted(load)
watch(() => carStore.currentCarId, load)
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
.actions {
  display: flex;
  align-items: center;
  gap: 12px;
}
.hint {
  margin-left: 8px;
  font-size: 12px;
}
</style>
