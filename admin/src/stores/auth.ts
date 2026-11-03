import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { CurrentUser, LoginResponse } from '@/api/types'
import { login as apiLogin, me } from '@/api/auth'

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string>(localStorage.getItem('carlog_token') || '')
  const user = ref<CurrentUser | null>(
    localStorage.getItem('carlog_user') ? JSON.parse(localStorage.getItem('carlog_user')!) : null
  )

  function applyLogin(data: LoginResponse) {
    token.value = data.token
    user.value = {
      id: data.userId,
      username: data.username,
      nickname: data.nickname,
      role: data.role
    }
    localStorage.setItem('carlog_token', data.token)
    localStorage.setItem('carlog_user', JSON.stringify(user.value))
  }

  async function login(username: string, password: string) {
    const data = await apiLogin(username, password)
    applyLogin(data)
  }

  async function restore() {
    if (!token.value) return false
    try {
      user.value = await me()
      localStorage.setItem('carlog_user', JSON.stringify(user.value))
      return true
    } catch {
      logout()
      return false
    }
  }

  function logout() {
    token.value = ''
    user.value = null
    localStorage.removeItem('carlog_token')
    localStorage.removeItem('carlog_user')
  }

  return { token, user, login, restore, logout, applyLogin }
})
