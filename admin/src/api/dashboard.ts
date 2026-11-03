import request from './request'
import type { DashboardOverview, MonthlyItem } from './types'

export function overview(carId: number) {
  return request.get<DashboardOverview>(`/dashboard/overview/${carId}`)
}

export function monthly(carId: number, months = 6) {
  return request.get<MonthlyItem[]>(`/dashboard/monthly/${carId}`, { params: { months } })
}
