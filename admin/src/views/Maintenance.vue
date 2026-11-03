<template>
  <div class="page">
    <div class="toolbar">
      <h2 class="title">保养记录</h2>
      <el-button type="primary" :icon="Plus" :disabled="!carStore.currentCarId" @click="openCreate">
        新增保养
      </el-button>
    </div>

    <el-card class="tpl-card">
      <template #header>保养周期模板</template>
      <div class="tpls">
        <div v-for="t in templates" :key="t.key" class="tpl">
          <span class="tpl-icon">{{ t.icon }}</span>
          <div>
            <div class="tpl-name">{{ t.name }}</div>
            <div class="muted tpl-desc">{{ t.desc }}</div>
          </div>
        </div>
      </div>
    </el-card>

    <el-card>
      <el-table :data="list" v-loading="loading" empty-text="暂无保养记录">
        <el-table-column label="项目" width="140">
          <template #default="{ row }">
            <span class="item-icon">{{ row.icon }}</span> {{ row.itemName }}
          </template>
        </el-table-column>
        <el-table-column prop="serviceDate" label="日期" width="120" />
        <el-table-column prop="mileage" label="里程(km)" width="110" />
        <el-table-column prop="cost" label="费用(元)" width="110" />
        <el-table-column prop="shop" label="门店" />
        <el-table-column prop="note" label="备注" />
        <el-table-column label="操作" width="160">
          <template #default="{ row }">
            <el-button text type="primary" :icon="Edit" @click="openEdit(row)">编辑</el-button>
            <el-button text type="danger" :icon="Delete" @click="onDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="dialog" :title="editing ? '编辑保养记录' : '新增保养记录'" width="460px">
      <el-form :model="form" :rules="rules" ref="formRef" label-width="86px">
        <el-form-item label="保养项目" prop="itemKey">
          <el-select v-model="form.itemKey" placeholder="选择项目" @change="onTplChange">
            <el-option v-for="t in templates" :key="t.key" :label="t.name" :value="t.key" />
          </el-select>
        </el-form-item>
        <el-form-item label="服务日期" prop="serviceDate">
          <el-date-picker v-model="form.serviceDate" type="date" value-format="YYYY-MM-DD" />
        </el-form-item>
        <el-form-item label="当时里程" prop="mileage">
          <el-input-number v-model="form.mileage" :min="0" :max="2000000" controls-position="right" />
        </el-form-item>
        <el-form-item label="费用(元)" prop="cost">
          <el-input-number v-model="form.cost" :min="0" :max="100000" :precision="2" controls-position="right" />
        </el-form-item>
        <el-form-item label="门店">
          <el-input v-model="form.shop" placeholder="如 4S店 / 途虎" />
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
import type { MaintenanceLog, MaintTemplate } from '@/api/types'
import {
  listTemplates,
  listMaintenanceLogs,
  createMaintenanceLog,
  updateMaintenanceLog,
  deleteMaintenanceLog
} from '@/api/maintenance'
import { useCarStore } from '@/stores/cars'

const carStore = useCarStore()
const loading = ref(false)
const list = ref<MaintenanceLog[]>([])
const templates = ref<MaintTemplate[]>([])
const templateMap = computed(() => {
  const m: Record<string, MaintTemplate> = {}
  templates.value.forEach((t) => (m[t.key] = t))
  return m
})
const dialog = ref(false)
const editing = ref<MaintenanceLog | null>(null)
const saving = ref(false)
const formRef = ref<FormInstance>()

const blank = () => ({
  carId: carStore.currentCarId,
  itemKey: '',
  itemName: '',
  icon: '',
  serviceDate: new Date().toISOString().slice(0, 10),
  mileage: 0,
  cost: 0,
  shop: '',
  note: ''
})
const form = reactive(blank())

const rules: FormRules = {
  itemKey: [{ required: true, message: '请选择保养项目', trigger: 'change' }],
  serviceDate: [{ required: true, message: '请选择日期', trigger: 'change' }],
  mileage: [{ required: true, message: '请填写里程', trigger: 'blur' }]
}

async function load() {
  loading.value = true
  try {
    list.value = await listMaintenanceLogs(carStore.currentCarId || undefined)
  } finally {
    loading.value = false
  }
}

async function loadTemplates() {
  templates.value = await listTemplates()
}

function onTplChange(key: string) {
  const t = templateMap.value[key]
  if (t) {
    form.itemName = t.name
    form.icon = t.icon
  }
}

function openCreate() {
  editing.value = null
  Object.assign(form, blank())
  dialog.value = true
}

function openEdit(row: MaintenanceLog) {
  editing.value = row
  Object.assign(form, {
    carId: row.carId,
    itemKey: row.itemKey,
    itemName: row.itemName,
    icon: row.icon,
    serviceDate: row.serviceDate,
    mileage: row.mileage,
    cost: row.cost,
    shop: row.shop || '',
    note: row.note || ''
  })
  dialog.value = true
}

async function onSave() {
  if (!formRef.value) return
  await formRef.value.validate(async (valid) => {
    if (!valid) return
    saving.value = true
    try {
      if (!form.itemName) onTplChange(form.itemKey)
      if (editing.value) {
        await updateMaintenanceLog(editing.value.id, { ...form })
        ElMessage.success('已更新')
      } else {
        await createMaintenanceLog({ ...form })
        ElMessage.success('已新增')
      }
      dialog.value = false
      await load()
    } finally {
      saving.value = false
    }
  })
}

function onDelete(row: MaintenanceLog) {
  ElMessageBox.confirm('确定删除这条保养记录吗？', '提示', { type: 'warning' })
    .then(async () => {
      await deleteMaintenanceLog(row.id)
      ElMessage.success('已删除')
      await load()
    })
    .catch(() => {})
}

onMounted(async () => {
  await loadTemplates()
  await load()
})
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
.tpls {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 12px;
}
.tpl {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 10px;
  background: var(--bg-2);
  border: 1px solid var(--border);
}
.tpl-icon {
  font-size: 22px;
}
.tpl-name {
  font-weight: 600;
}
.tpl-desc {
  font-size: 12px;
}
.item-icon {
  margin-right: 4px;
}
</style>
