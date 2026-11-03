import axios, { type AxiosInstance } from 'axios'
import { ElMessage } from 'element-plus'
import type { Router } from 'vue-router'

/**
 * 统一请求封装
 * 后端约定：所有接口返回 { code, message, data }，code=0 为成功。
 * 拦截器在这里把 data 直接拆出来给调用方，减少模板代码。
 */
const request: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE || '/api',
  timeout: 15000
})

let routerRef: Router | null = null
export function setRouter(r: Router) {
  routerRef = r
}

request.interceptors.request.use((config) => {
  const token = localStorage.getItem('carlog_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

request.interceptors.response.use(
  (resp) => {
    const body = resp.data
    // 非标准结构（如静态资源）直接放行
    if (!body || typeof body.code === 'undefined') {
      return body
    }
    if (body.code === 0) {
      return body.data
    }
    ElMessage.error(body.message || '请求失败')
    return Promise.reject(new Error(body.message || 'business error'))
  },
  (err) => {
    const status = err.response?.status
    const msg = err.response?.data?.message || err.message || '网络错误'
    if (status === 401) {
      localStorage.removeItem('carlog_token')
      localStorage.removeItem('carlog_user')
      ElMessage.warning('登录已过期，请重新登录')
      routerRef?.replace('/login')
    } else {
      ElMessage.error(msg)
    }
    return Promise.reject(err)
  }
)

export default request
