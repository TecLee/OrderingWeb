import request from './index'
import type { ApiResponse, MiniAppUser, PaginatedData } from '../types'

export function getUsers(params: { page?: number; page_size?: number }): Promise<ApiResponse<PaginatedData<MiniAppUser>>> {
  return request.get('/users', { params })
}

export function updateUser(userId: number, data: { role?: string; permissions?: string }): Promise<ApiResponse<MiniAppUser>> {
  return request.put(`/users/${userId}`, data)
}
