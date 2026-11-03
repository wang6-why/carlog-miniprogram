// 与后端 DTO / 实体对齐的类型定义

export interface LoginResponse {
  token: string
  userId: number
  username: string
  nickname: string
  role: string
  expiresIn: number
}

export interface CurrentUser {
  id: number
  username: string
  nickname: string
  role: string
}

export interface Car {
  id: number
  userId: number
  brand: string
  model: string
  modelYear?: number
  plate?: string
  fuelType?: string
  tankCapacity?: number
  color?: string
  odometer: number
  purchaseDate?: string
  insuranceExpiry?: string
  inspectionExpiry?: string
  createTime?: string
  updateTime?: string
}

export interface FuelLog {
  id: number
  userId: number
  carId: number
  mileage: number
  liters: number
  price: number
  amount: number
  isFull: boolean
  station?: string
  note?: string
  fuelDate: string
  createTime?: string
}

export interface MaintenanceLog {
  id: number
  userId: number
  carId: number
  itemKey: string
  itemName: string
  icon?: string
  mileage: number
  cost: number
  shop?: string
  note?: string
  serviceDate: string
  createTime?: string
}

export interface MaintTemplate {
  key: string
  name: string
  icon: string
  desc: string
  kmCycle: number | null
  monthCycle: number | null
}

export interface MaintAlert {
  key: string
  name: string
  icon: string
  desc: string
  lastDate: string | null
  lastMileage: number | null
  nextMileage: number | null
  nextDate: string | null
  remainKm: number | null
  remainDays: number | null
  percent: number
  status: 'normal' | 'soon' | 'overdue' | 'unknown'
  statusText: string
}

export interface DashboardOverview {
  carId: number
  carName: string
  plate: string
  color: string
  odometer: number
  latestConsumption: number
  avgConsumption: number
  trend: number
  monthSpend: number
  totalAmount: number
  recordCount: number
  totalKm: number
  costPerKm: number
  alerts: MaintAlert[]
}

export interface MonthlyItem {
  ym: string
  label: string
  fuel: number
  maintenance: number
  total: number
}
