<template>
  <div class="chart">
    <div v-for="(m, i) in items" :key="m.ym" class="col" :style="{ height: colHeight + 'px' }">
      <div class="bars">
        <div
          class="bar fuel"
          :style="{ height: barH(m.fuel) + 'px' }"
          :title="`${m.label} 加油 ¥${m.fuel.toFixed(0)}`"
        />
        <div
          class="bar maint"
          :style="{ height: barH(m.maintenance) + 'px' }"
          :title="`${m.label} 保养 ¥${m.maintenance.toFixed(0)}`"
        />
      </div>
      <div class="label">{{ m.label }}</div>
      <div class="val">¥{{ m.total.toFixed(0) }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { MonthlyItem } from '@/api/types'

const props = withDefaults(
  defineProps<{ items: MonthlyItem[]; height?: number }>(),
  { height: 200 }
)

const colHeight = computed(() => props.height)
const max = computed(() => {
  const v = Math.max(1, ...props.items.map((i) => i.total))
  return v
})

function barH(v: number) {
  // 留出顶部 24px 给文字，底部由 label 占
  const usable = props.height - 28
  return Math.max(2, (v / max.value) * usable)
}
</script>

<style scoped>
.chart {
  display: flex;
  align-items: flex-end;
  gap: 14px;
  padding: 8px 4px 0;
}
.col {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
}
.bars {
  display: flex;
  align-items: flex-end;
  gap: 4px;
  height: 100%;
}
.bar {
  width: 18px;
  border-radius: 5px 5px 0 0;
  transition: height 0.3s ease;
}
.bar.fuel {
  background: linear-gradient(180deg, var(--neon), rgba(0, 212, 255, 0.4));
  box-shadow: 0 0 10px rgba(0, 212, 255, 0.4);
}
.bar.maint {
  background: linear-gradient(180deg, var(--neon-2), rgba(124, 77, 255, 0.4));
  box-shadow: 0 0 10px rgba(124, 77, 255, 0.4);
}
.label {
  margin-top: 8px;
  font-size: 12px;
  color: var(--text-1);
}
.val {
  font-size: 11px;
  color: var(--text-2);
}
</style>
