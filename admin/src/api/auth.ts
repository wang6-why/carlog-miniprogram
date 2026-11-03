import request from './request'
import type { LoginResponse, CurrentUser } from './types'

export function login(username: string, password: string) {
  return request.post<LoginResponse>('/auth/login', { username, password })
}

export function register(username: string, password: string, nickname: string) {
  return request.post<LoginResponse>('/auth/register', { username, password, nickname })
}

export function me() {
  return request.get<CurrentUser>('/auth/me')
}
