import request from './request'
import type { Car } from './types'

export function listCars() {
  return request.get<Car[]>('/cars')
}

export function getCar(id: number) {
  return request.get<Car>(`/cars/${id}`)
}

export function createCar(data: Partial<Car>) {
  return request.post<Car>('/cars', data)
}

export function updateCar(id: number, data: Partial<Car>) {
  return request.put<Car>(`/cars/${id}`, data)
}

export function deleteCar(id: number) {
  return request.delete(`/cars/${id}`)
}
