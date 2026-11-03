<template>
  <div class="dashboard" v-loading="loading">
    <template v-if="data">
      <!-- 概览卡片 -->
      <div class="cards">
        <el-card class="stat" v-for="s in stats" :key="s.label">
          <div class="stat-label">{{ s.label }}</div>
          <div class="stat-value" :class="s.cls">{{ s.value }}</div>
          <div class="stat-extra" v-if="s.extra">{{ s.extra }}</div>
        </el-card>
      </div>

      <!-- 保养告警 -->
      <el-card class="block">
        <template #header>保养提醒</template>
        <div v-if="data.alerts.length === 0" class="muted empty">暂无保养记录</div>
        <div v-else class="alerts">
          <div
            v-for="a in data.alerts"
            :key="a.key"
            class="alert"
            :class="a.status"
          >
            <div class="alert-icon">{{ a.icon }}</div>
            <div class="alert-body">
              <div class="alert-name">
                {{ a.name }}
                <el-tag size="small" :type="tagType(a.status)">{{ a.statusText }}</el-tag>
              </div>
              <div class="alert-desc muted">{{ a.desc }}</div>
              <div class="alert-meta">
                <span v-if="a.lastDate">上次：{{ a.lastDate }} / {{ a.lastMileage }}km</span>
                <span v-if="a.nextDate">· 下次：{{ a.nextDate }} / {{ a.nextMileage }}km</span>
              </div>
            </div>
            <div class="alert-bar">
              <div class="alert-bar-fill" :class="a.status" :style="{ width: a.percent + '%' }" />
            </div>
          </div>
        </div>
      </el-card>

      <!-- 月度支出 -->
      <el-card class="block">
        <template #header>
          <div class="month-head">
            <span>近 6 个月支出</span>
            <div class="legend">
              <span><i class="dot fuel" />加油</span>
              <span><i class="dot maint" />保养</span>
            </div>
          </div>
        </template>
        <MonthlyChart :items="monthly" :height="220" />
      </el-card>
    </template>

    <el-empty v-else description="该账户下暂无车辆，请先到「车辆管理」添加" />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { overview, monthly as fetchMonthly } from '@/api/dashboard'
import type { DashboardOverview, MonthlyItem, MaintAlert } from '@/api/types'
import { useCarStore } from '@/stores/cars'
import MonthlyChart from '@/components/MonthlyChart.vue'

const carStore = useCarStore()
const loading = ref(false)
const data = ref<DashboardOverview | null>(null)
const monthly = ref<MonthlyItem[]>([])

const stats = computed(() => {
  const d = data.value!
  return [
    { label: '平均油耗', value: `${d.avgConsumption} L/100km`, cls: 'neon', extra: `近期 ${d.latestConsumption}` },
    { label: '当前里程', value: `${d.odometer.toLocaleString()} km`, cls: '' },
    { label: '累计花费', value: `¥${d.totalAmount.toLocaleString()}`, cls: 'green' },
    { label: '记录次数', value: `${d.recordCount} 次`, cls: '' },
    { label: '每公里成本', value: `¥${d.costPerKm}`, cls: 'green' },
    { label: '累计里程', value: `${d.totalKm.toLocaleString()} km`, cls: '' }
  ]
})

function tagType(status: MaintAlert['status']): 'danger' | 'warning' | 'info' | 'success' {
  return status === 'overdue'
    ? 'danger'
    : status === 'soon'
      ? 'warning'
      : status === 'unknown'
        ? 'info'
        : 'success'
}

async function load() {
  if (!carStore.currentCarId) {
    data.value = null
    return
  }
  loading.value = true
  try {
    data.value = await overview(carStore.currentCarId)
    monthly.value = await fetchMonthly(carStore.currentCarId, 6)
  } finally {
    loading.value = false
  }
}

onMounted(load)
// 切换车辆（layout 用 key 强制重渲染，这里再兜底 watch 一次）
watch(() => carStore.currentCarId, load)
</script>

<style scoped>
.dashboard {
  display: flex;
  flex-direction: column;
  gap: 18px;
}
.cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
  gap: 14px;
}
.stat-label {
  color: var(--text-2);
  font-size: 13px;
}
.stat-value {
  font-size: 24px;
  font-weight: 700;
  margin-top: 8px;
}
.stat-value.neon {
  color: var(--neon);
}
.stat-value.green {
  color: var(--neon-green);
}
.stat-extra {
  font-size: 12px;
  color: var(--text-2);
  margin-top: 4px;
}
.block {
  width: 100%;
}
.empty {
  padding: 24px;
  text-align: center;
}
.alerts {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.alert {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px 14px;
  border-radius: 12px;
  background: var(--bg-2);
  border: 1px solid var(--border);
}
.alert.overdue {
  border-color: rgba(255, 77, 109, 0.5);
}
.alert-icon {
  font-size: 26px;
}
.alert-body {
  flex: 1;
}
.alert-name {
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
}
.alert-desc {
  font-size: 12px;
  margin: 2px 0;
}
.alert-meta {
  font-size: 12px;
  color: var(--text-1);
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}
.alert-bar {
  width: 120px;
  height: 6px;
  border-radius: 4px;
  background: var(--bg-0);
  overflow: hidden;
}
.alert-bar-fill {
  height: 100%;
  background: var(--neon-green);
}
.alert-bar-fill.soon {
  background: var(--warn);
}
.alert-bar-fill.overdue {
  background: var(--danger);
}
.alert-bar-fill.unknown {
  background: var(--text-2);
}
.month-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.legend {
  display: flex;
  gap: 16px;
  font-size: 12px;
  color: var(--text-1);
}
.legend .dot {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 3px;
  margin-right: 5px;
}
.dot.fuel {
  background: var(--neon);
}
.dot.maint {
  background: var(--neon-2);
}
</style>
