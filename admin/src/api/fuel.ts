import request from './request'
import type { FuelLog } from './types'

export function listFuelLogs(carId?: number) {
  return request.get<FuelLog[]>('/fuel-logs', { params: carId ? { carId } : {} })
}

export function createFuelLog(data: Partial<FuelLog>) {
  return request.post<FuelLog>('/fuel-logs', data)
}

export function updateFuelLog(id: number, data: Partial<FuelLog>) {
  return request.put<FuelLog>(`/fuel-logs/${id}`, data)
}

export function deleteFuelLog(id: number) {
  return request.delete(`/fuel-logs/${id}`)
}
