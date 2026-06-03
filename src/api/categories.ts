import request from './index'
import type { ApiResponse, Category } from '../types'

export function getCategories(): Promise<ApiResponse<Category[]>> {
  return request.get('/categories')
}

export function createCategory(data: { name: string }): Promise<ApiResponse<Category>> {
  return request.post('/categories', data)
}

export function updateCategory(id: number, data: { name?: string }): Promise<ApiResponse<Category>> {
  return request.put(`/categories/${id}`, data)
}

export function deleteCategory(id: number): Promise<ApiResponse<null>> {
  return request.delete(`/categories/${id}`)
}
