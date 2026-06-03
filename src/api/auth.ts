import request from './index'
import type { ApiResponse, AdminUser } from '../types'

export function login(username: string, password: string): Promise<ApiResponse<{ token: string; user: AdminUser }>> {
  return request.post('/auth/login', { username, password })
}

export function getMe(): Promise<ApiResponse<AdminUser>> {
  return request.get('/auth/me')
}
