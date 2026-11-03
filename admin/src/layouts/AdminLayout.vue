<template>
  <el-container class="layout">
    <el-aside width="220px" class="aside">
      <div class="brand">
        <span class="logo-dot" />
        <div>
          <div class="brand-name">车迹</div>
          <div class="brand-sub">养车记账 · 后台</div>
        </div>
      </div>
      <el-menu
        :default-active="activeMenu"
        router
        background-color="transparent"
        text-color="#9fb0c8"
        active-text-color="#00d4ff"
      >
        <el-menu-item index="/dashboard">
          <el-icon><Odometer /></el-icon>
          <span>数据看板</span>
        </el-menu-item>
        <el-menu-item index="/cars">
          <el-icon><Van /></el-icon>
          <span>车辆管理</span>
        </el-menu-item>
        <el-menu-item index="/fuel">
          <el-icon><ShoppingCart /></el-icon>
          <span>加油记录</span>
        </el-menu-item>
        <el-menu-item index="/maintenance">
          <el-icon><Tools /></el-icon>
          <span>保养记录</span>
        </el-menu-item>
      </el-menu>
    </el-aside>

    <el-container>
      <el-header class="header">
        <div class="car-switch">
          <span class="muted">当前车辆</span>
          <el-select
            :model-value="carStore.currentCarId"
            placeholder="选择车辆"
            style="width: 200px"
            @change="onCarChange"
          >
            <el-option
              v-for="c in carStore.cars"
              :key="c.id"
              :label="`${c.brand} ${c.model}`"
              :value="c.id"
            />
          </el-select>
        </div>
        <div class="user-box">
          <el-tag v-if="auth.user?.role === 'ADMIN'" type="warning" size="small">管理员</el-tag>
          <span class="user-name">{{ auth.user?.nickname || auth.user?.username }}</span>
          <el-button text :icon="SwitchButton" @click="onLogout">退出</el-button>
        </div>
      </el-header>

      <el-main class="main">
        <router-view v-slot="{ Component }">
          <component :is="Component" :key="carStore.currentCarId" />
        </router-view>
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessageBox } from 'element-plus'
import { Odometer, Van, ShoppingCart, Tools, SwitchButton } from '@element-plus/icons-vue'
import { useAuthStore } from '@/stores/auth'
import { useCarStore } from '@/stores/cars'

const auth = useAuthStore()
const carStore = useCarStore()
const router = useRouter()
const route = useRoute()

const activeMenu = computed(() => route.path)

function onCarChange(id: number) {
  carStore.setCurrent(id)
}

function onLogout() {
  ElMessageBox.confirm('确定要退出登录吗？', '提示', {
    type: 'warning',
    confirmButtonText: '退出',
    cancelButtonText: '取消'
  })
    .then(() => {
      auth.logout()
      router.replace('/login')
    })
    .catch(() => {})
}

onMounted(async () => {
  if (carStore.cars.length === 0) {
    await carStore.load()
  }
})
</script>

<style scoped>
.layout {
  height: 100%;
}
.aside {
  background: var(--bg-1);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
}
.brand {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 20px 18px;
  border-bottom: 1px solid var(--border);
}
.logo-dot {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--neon), var(--neon-2));
  box-shadow: 0 0 12px rgba(0, 212, 255, 0.7);
}
.brand-name {
  font-size: 20px;
  font-weight: 800;
  color: var(--text-0);
  letter-spacing: 2px;
}
.brand-sub {
  font-size: 12px;
  color: var(--text-2);
}
.aside :deep(.el-menu) {
  border-right: none;
  margin-top: 8px;
}
.aside :deep(.el-menu-item.is-active) {
  background: rgba(0, 212, 255, 0.08);
  border-right: 2px solid var(--neon);
}
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 60px;
  background: var(--bg-1);
  border-bottom: 1px solid var(--border);
}
.car-switch {
  display: flex;
  align-items: center;
  gap: 10px;
}
.user-box {
  display: flex;
  align-items: center;
  gap: 10px;
}
.user-name {
  color: var(--text-0);
  font-weight: 600;
}
.main {
  background: transparent;
  padding: 20px;
}
</style>
