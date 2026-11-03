import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Car } from '@/api/types'
import { listCars } from '@/api/car'

/**
 * 全局选中的车辆：看板 / 加油 / 保养页都依赖它。
 * 启动后在布局里 load()，之后各页面直接读 currentCarId。
 */
export const useCarStore = defineStore('cars', () => {
  const cars = ref<Car[]>([])
  const currentCarId = ref<number>(0)

  async function load() {
    cars.value = await listCars()
    if (cars.value.length > 0) {
      if (!cars.value.some((c) => c.id === currentCarId.value)) {
        currentCarId.value = cars.value[0].id
      }
    } else {
      currentCarId.value = 0
    }
  }

  function setCurrent(id: number) {
    currentCarId.value = id
  }

  return { cars, currentCarId, load, setCurrent }
})
