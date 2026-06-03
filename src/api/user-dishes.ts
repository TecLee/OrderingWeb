import miniappRequest from './miniapp'
import type { ApiResponse, Dish, PaginatedData } from '../types'

export function getUserDishes(params: {
  category_id?: number
  page?: number
  page_size?: number
}): Promise<ApiResponse<PaginatedData<Dish>>> {
  return miniappRequest.get('/dishes', { params })
}

export function getUserCategories(): Promise<ApiResponse<{ id: number; name: string }[]>> {
  return miniappRequest.get('/categories')
}
