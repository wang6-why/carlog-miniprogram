import request from './request'
import type { MaintenanceLog, MaintTemplate } from './types'

export function listTemplates() {
  return request.get<MaintTemplate[]>('/maintenance/templates')
}

export function listMaintenanceLogs(carId?: number) {
  return request.get<MaintenanceLog[]>('/maintenance/logs', { params: carId ? { carId } : {} })
}

export function createMaintenanceLog(data: Partial<MaintenanceLog>) {
  return request.post<MaintenanceLog>('/maintenance/logs', data)
}

export function updateMaintenanceLog(id: number, data: Partial<MaintenanceLog>) {
  return request.put<MaintenanceLog>(`/maintenance/logs/${id}`, data)
}

export function deleteMaintenanceLog(id: number) {
  return request.delete(`/maintenance/logs/${id}`)
}
