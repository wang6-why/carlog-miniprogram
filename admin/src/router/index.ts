import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/Login.vue'),
      meta: { public: true }
    },
    {
      path: '/',
      component: () => import('@/layouts/AdminLayout.vue'),
      redirect: '/dashboard',
      children: [
        {
          path: 'dashboard',
          name: 'dashboard',
          component: () => import('@/views/Dashboard.vue'),
          meta: { title: '数据看板' }
        },
        {
          path: 'cars',
          name: 'cars',
          component: () => import('@/views/Cars.vue'),
          meta: { title: '车辆管理' }
        },
        {
          path: 'fuel',
          name: 'fuel',
          component: () => import('@/views/FuelLogs.vue'),
          meta: { title: '加油记录' }
        },
        {
          path: 'maintenance',
          name: 'maintenance',
          component: () => import('@/views/Maintenance.vue'),
          meta: { title: '保养记录' }
        }
      ]
    },
    { path: '/:pathMatch(.*)*', redirect: '/dashboard' }
  ]
})

router.beforeEach(async (to) => {
  const auth = useAuthStore()
  if (to.meta.public) {
    // 已登录用户访问登录页直接进后台
    if (auth.token) return '/dashboard'
    return true
  }
  if (!auth.token) return '/login'
  // 首次进入且 token 存在但未还原用户信息时，拉一次 /auth/me
  if (!auth.user) {
    const ok = await auth.restore()
    if (!ok) return '/login'
  }
  return true
})

export default router
