import request from './index'
import type { ApiResponse, Dish, PaginatedData } from '../types'

export function getDishes(params: {
  keyword?: string
  category_id?: number
  page?: number
  page_size?: number
}): Promise<ApiResponse<PaginatedData<Dish>>> {
  return request.get('/dishes', { params })
}

export function getDish(id: number): Promise<ApiResponse<Dish>> {
  return request.get(`/dishes/${id}`)
}

export function createDish(form: FormData): Promise<ApiResponse<Dish>> {
  return request.post('/dishes', form, { headers: { 'Content-Type': 'multipart/form-data' } })
}

export function updateDish(id: number, form: FormData): Promise<ApiResponse<Dish>> {
  return request.put(`/dishes/${id}`, form, { headers: { 'Content-Type': 'multipart/form-data' } })
}

export function deleteDish(id: number): Promise<ApiResponse<null>> {
  return request.delete(`/dishes/${id}`)
}
